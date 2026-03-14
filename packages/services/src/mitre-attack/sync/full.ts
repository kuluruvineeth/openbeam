import type {
  MitreAttackSyncBatch,
  MitreAttackSyncCursor,
  MitreAttackSyncOptions,
  MitreAttackTransformContext,
  StixAttackPattern,
  StixCourseOfAction,
  StixIntrusionSet,
  StixMalware,
  StixRelationship,
  StixTactic,
} from "@openbeam/types/services/connectors/mitre-attack";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { buildRelationshipMap, isRevokedOrDeprecated } from "../api/stix";
import { fetchStixBundle, getDomainUrl } from "../client";
import { transformMitigation } from "../transformers/mitigation";
import { transformSoftware } from "../transformers/software";
import { transformTactic } from "../transformers/tactic";
import { transformTechnique } from "../transformers/technique";
import { transformThreatGroup } from "../transformers/threat-group";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_DOMAINS = ["enterprise"] as const;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

function createBatch(
  state: SyncState,
  cursor: MitreAttackSyncCursor,
  hasMore: boolean
): MitreAttackSyncBatch<GenericDocument> {
  return {
    items: state.documents,
    cursor: { ...cursor },
    hasMore,
    stats: {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
  };
}

interface TransformObjectParams {
  obj: Record<string, unknown>;
  ctx: MitreAttackTransformContext;
}

function transformStixObject(
  params: TransformObjectParams
): Promise<GenericDocument | null> {
  const { obj, ctx } = params;
  const type = obj.type as string;

  switch (type) {
    case "attack-pattern":
      return transformTechnique(obj as unknown as StixAttackPattern, ctx);
    case "x-mitre-tactic":
      return transformTactic(obj as unknown as StixTactic, ctx);
    case "intrusion-set":
      return transformThreatGroup(obj as unknown as StixIntrusionSet, ctx);
    case "malware":
    case "tool":
      return transformSoftware(obj as unknown as StixMalware, ctx);
    case "course-of-action":
      return transformMitigation(obj as unknown as StixCourseOfAction, ctx);
    default:
      return Promise.resolve(null);
  }
}

const TRANSFORMABLE_TYPES = new Set([
  "attack-pattern",
  "x-mitre-tactic",
  "intrusion-set",
  "malware",
  "tool",
  "course-of-action",
]);

export async function* fullSync(
  context: MitreAttackTransformContext,
  options: MitreAttackSyncOptions = {}
): AsyncGenerator<MitreAttackSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    domains = [...DEFAULT_DOMAINS],
    onStageChange,
  } = options;

  logger.info({ domains }, "MITRE ATT&CK full sync started");

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: MitreAttackSyncCursor = {
    lastSyncTime: Date.now(),
    domainsCompleted: [],
    objectsProcessed: 0,
  };

  for (const domain of domains) {
    await onStageChange?.(`Fetching ${domain} bundle`, state.processed);

    const url = getDomainUrl(domain);
    const bundle = await fetchStixBundle(url);
    const domainContext = { ...context, domain };

    const relationships = bundle.objects.filter(
      (obj) => obj.type === "relationship"
    ) as unknown as StixRelationship[];
    buildRelationshipMap(relationships);

    const transformableObjects = bundle.objects.filter((obj) =>
      TRANSFORMABLE_TYPES.has(obj.type as string)
    );

    await onStageChange?.(
      `Processing ${domain} objects`,
      state.processed,
      `${transformableObjects.length} objects`
    );

    for (const obj of transformableObjects) {
      if (isRevokedOrDeprecated(obj)) {
        state.skipped += 1;
        continue;
      }

      try {
        const document = await transformStixObject({ obj, ctx: domainContext });
        if (!document) {
          state.skipped += 1;
          continue;
        }

        state.documents.push(document);
        state.processed += 1;
        cursor.objectsProcessed = state.processed;

        if (state.documents.length >= batchSize) {
          yield createBatch(state, cursor, true);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, stixId: obj.id, type: obj.type },
          "Error transforming STIX object"
        );
        state.errors += 1;
      }
    }

    cursor.domainsCompleted?.push(domain);
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
      remaining: state.documents.length,
    },
    "MITRE ATT&CK full sync complete"
  );

  if (state.documents.length > 0) {
    yield createBatch(state, cursor, false);
  }
}
