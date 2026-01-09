import { getConfig } from "@openplane/ai";
import prisma, {
  batchUpsertEntities,
  batchUpsertEntityRelations,
  type CreateEntityMentionInput,
  createManyEntityMentions,
  type EntityType,
  type EvidenceItem,
  type UpsertEntityInput,
  type UpsertEntityRelationInput,
} from "@openplane/db";
import type { EntityExtractionJobData } from "@openplane/redis";
import type { Job } from "bullmq";
import logger from "../../utils/logger";

interface EngineEntityResponse {
  doc_id: string;
  entities: Array<{
    text: string;
    label: string;
    score: number;
    source: string;
  }>;
  entity_count: number;
}

interface ExtractionResult {
  documentId: string;
  entitiesCreated: number;
  relationsCreated: number;
  elapsedMs: number;
}

class RetryableError extends Error {
  readonly retryable = true;
  readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "RetryableError";
    this.retryAfter = retryAfter;
  }
}

class NonRetryableError extends Error {
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

const EXTRACTION_TIMEOUT_MS = 30_000;

const LABEL_TO_TYPE: Record<string, EntityType> = {
  person: "PERSON",
  team: "TEAM",
  project: "PROJECT",
  topic: "TOPIC",
  technology: "TECHNOLOGY",
  location: "LOCATION",
  organization: "ORGANIZATION",
  channel: "CHANNEL",
  repository: "REPOSITORY",
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

async function fetchEntities(
  engineUrl: string,
  payload: {
    doc_id: string;
    title: string;
    content: string;
    author?: string;
    connector_metadata?: Record<string, unknown>;
  }
): Promise<EngineEntityResponse> {
  const response = await fetch(`${engineUrl}/v1/entities/extract/document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const status = response.status;

    if (status >= 500) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RetryableError(
        `Engine error: ${status}`,
        retryAfter ? Number.parseInt(retryAfter, 10) : undefined
      );
    }

    if (status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RetryableError(
        "Rate limited",
        retryAfter ? Number.parseInt(retryAfter, 10) : 60
      );
    }

    if (status === 401 || status === 403) {
      throw new NonRetryableError(`Auth error: ${status} - ${errorText}`);
    }

    throw new NonRetryableError(`Client error: ${status} - ${errorText}`);
  }

  return response.json() as Promise<EngineEntityResponse>;
}

interface ExtractedEntityData {
  text: string;
  label: string;
  score: number;
  source: string;
  entityType: EntityType;
  normalizedName: string;
}

function prepareEntityData(
  entities: EngineEntityResponse["entities"]
): ExtractedEntityData[] {
  const result: ExtractedEntityData[] = [];

  for (const entity of entities) {
    const entityType = LABEL_TO_TYPE[entity.label.toLowerCase()];
    if (!entityType) {
      continue;
    }
    result.push({
      ...entity,
      entityType,
      normalizedName: normalizeName(entity.text),
    });
  }

  return result;
}

interface AuthorRelationsContext {
  author: string;
  connectorType: string;
  teamId: string;
  documentId: string;
  extractedData: ExtractedEntityData[];
  entityMap: Map<string, string>;
}

async function createAuthorRelations(
  ctx: AuthorRelationsContext
): Promise<number> {
  const {
    author,
    connectorType,
    teamId,
    documentId,
    extractedData,
    entityMap,
  } = ctx;
  const authorNormalized = normalizeName(author);

  const authorEntities = await batchUpsertEntities(prisma, [
    {
      teamId,
      type: "PERSON",
      name: author,
      normalizedName: authorNormalized,
      externalSource: connectorType,
    },
  ]);

  const authorEntity = authorEntities[0];
  if (!authorEntity) {
    logger.warn({ author, documentId }, "Failed to create author entity");
    return 0;
  }

  const topicRelations: UpsertEntityRelationInput[] = [];
  const evidence: EvidenceItem = {
    docId: documentId,
    timestamp: new Date().toISOString(),
  };

  for (const e of extractedData) {
    if (e.entityType === "TOPIC" || e.entityType === "TECHNOLOGY") {
      const topicId = entityMap.get(e.text);
      if (topicId) {
        topicRelations.push({
          fromEntityId: authorEntity.id,
          toEntityId: topicId,
          relationType: "EXPERT_IN",
          weight: e.score,
          confidence: e.score,
          evidence: [evidence],
        });
      }
    }
  }

  if (topicRelations.length > 0) {
    await batchUpsertEntityRelations(prisma, topicRelations);
  }

  return topicRelations.length;
}

export async function processEntityExtractionJob(
  job: Job<EntityExtractionJobData>
): Promise<ExtractionResult> {
  const {
    teamId,
    documentId,
    title,
    content,
    author,
    connectorType,
    connectorMetadata,
  } = job.data;

  const startTime = Date.now();

  const log = logger.child({
    jobId: job.id,
    documentId,
    teamId,
  });

  log.info("Starting entity extraction");

  const config = getConfig();
  const engineUrl = config.engine.gpuURL;

  const result = await fetchEntities(engineUrl, {
    doc_id: documentId,
    title,
    content: content.slice(0, 50_000),
    author,
    connector_metadata: connectorMetadata,
  });

  log.info({ entityCount: result.entity_count }, "Entities extracted");

  const extractedData = prepareEntityData(result.entities);

  if (extractedData.length === 0) {
    const elapsedMs = Date.now() - startTime;
    log.info({ elapsedMs }, "No entities to process");
    return { documentId, entitiesCreated: 0, relationsCreated: 0, elapsedMs };
  }

  const entityInputs: UpsertEntityInput[] = extractedData.map((e) => ({
    teamId,
    type: e.entityType,
    name: e.text,
    normalizedName: e.normalizedName,
    externalSource: connectorType,
  }));

  const entities = await batchUpsertEntities(prisma, entityInputs);

  const entityMap = new Map<string, string>();
  for (let i = 0; i < extractedData.length; i += 1) {
    const extracted = extractedData[i];
    const entity = entities[i];
    if (extracted && entity) {
      entityMap.set(extracted.text, entity.id);
    }
  }

  const mentionInputs: CreateEntityMentionInput[] = [];
  for (const e of extractedData) {
    const entityId = entityMap.get(e.text);
    if (entityId) {
      mentionInputs.push({
        entityId,
        documentId,
        teamId,
        mentionText: e.text,
        confidence: e.score,
        source: e.source,
      });
    }
  }

  if (mentionInputs.length > 0) {
    await createManyEntityMentions(prisma, mentionInputs);
  }

  const relationsCreated = author
    ? await createAuthorRelations({
        author,
        connectorType,
        teamId,
        documentId,
        extractedData,
        entityMap,
      })
    : 0;

  const elapsedMs = Date.now() - startTime;

  log.info(
    { entitiesCreated: extractedData.length, relationsCreated, elapsedMs },
    "Entity extraction completed"
  );

  return {
    documentId,
    entitiesCreated: extractedData.length,
    relationsCreated,
    elapsedMs,
  };
}
