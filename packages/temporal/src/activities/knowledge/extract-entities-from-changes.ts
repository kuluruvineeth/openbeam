import type { Database, EntityType } from "@openplane/db";
import type { VespaClient } from "@openplane/vespa";
import { Context } from "@temporalio/activity";
import type {
  EntityMention,
  ExtractEntitiesFromChangesInput,
  ExtractEntitiesFromChangesOutput,
} from "./types";

export interface ExtractEntitiesDependencies {
  db: Database;
  vespa: VespaClient;
  engineBaseUrl: string;
}

interface EngineEntityRaw {
  text: string;
  label?: string;
  type?: string;
  score?: number;
  confidence?: number;
}

interface EngineEntity {
  text: string;
  type: string;
  confidence: number;
}

function normalizeEngineEntity(raw: EngineEntityRaw): EngineEntity {
  return {
    text: raw.text,
    type: raw.label ?? raw.type ?? "TOPIC",
    confidence: raw.score ?? raw.confidence ?? 0,
  };
}

const BATCH_SIZE = 50;
const NER_MAX_CONTENT_LENGTH = 50_000;
const MENTION_SOURCE = "INFERENCE_PIPELINE";

export function createExtractEntitiesFromChangesActivity(
  deps: ExtractEntitiesDependencies
) {
  return async function extractEntitiesFromChanges(
    input: ExtractEntitiesFromChangesInput
  ): Promise<ExtractEntitiesFromChangesOutput> {
    const mentions: EntityMention[] = [];
    let entitiesUpdated = 0;

    for (let i = 0; i < input.documentIds.length; i += BATCH_SIZE) {
      const batch = input.documentIds.slice(i, i + BATCH_SIZE);
      const mentionRows: Array<{
        entityId: string;
        documentId: string;
        teamId: string;
        mentionText: string;
        context?: string;
        confidence: number;
        source: string;
      }> = [];

      for (const documentId of batch) {
        const doc = await deps.db.indexedDocument.findFirst({
          where: { vespaId: documentId },
          select: {
            title: true,
            connectorId: true,
            metadata: true,
            connector: { select: { type: true } },
          },
        });

        const vespaDoc = await deps.vespa
          .getDocument(documentId)
          .catch(() => null);
        const title = doc?.title ?? vespaDoc?.title ?? "";
        const rawContent = vespaDoc?.content ?? vespaDoc?.content_plain ?? "";
        const content = rawContent || title;
        if (!content.trim()) {
          continue;
        }

        const docMetadata = (doc?.metadata as Record<string, unknown>) ?? {};
        const entities = await callEngineNer({
          baseUrl: deps.engineBaseUrl,
          documentId,
          title,
          content,
          metadata: {
            author: vespaDoc?.author_name as string | undefined,
            authorEmail: vespaDoc?.author_email as string | undefined,
            connectorType: doc?.connector?.type,
            connectorMetadata: docMetadata,
            assignees: (docMetadata.assignees as string[]) ?? undefined,
            reviewers:
              (docMetadata.requestedReviewers as string[]) ?? undefined,
            labels:
              (docMetadata.labels as Array<{ name: string }>) ?? undefined,
          },
        });

        for (const entity of entities) {
          const resolved = await resolveEntity(deps.db, input.teamId, entity);

          const normalizedEntityType = mapEntityType(entity.type);
          mentions.push({
            entityId: resolved.id,
            entityName: entity.text,
            entityType: normalizedEntityType,
            documentId,
            confidence: entity.confidence,
          });

          mentionRows.push({
            entityId: resolved.id,
            documentId,
            teamId: input.teamId,
            mentionText: entity.text,
            context: title || undefined,
            confidence: entity.confidence,
            source: MENTION_SOURCE,
          });
          entitiesUpdated += 1;
        }
      }

      if (mentionRows.length > 0) {
        await deps.db.entityMention.createMany({
          data: mentionRows,
          skipDuplicates: true,
        });
      }

      Context.current().heartbeat({
        processed: Math.min(i + BATCH_SIZE, input.documentIds.length),
        total: input.documentIds.length,
      });
    }

    return { entitiesUpdated, mentions };
  };
}

interface EngineNerMetadata {
  author?: string;
  authorEmail?: string;
  connectorType?: string;
  connectorMetadata?: Record<string, unknown>;
  participants?: string[];
  assignees?: string[];
  reviewers?: string[];
  labels?: Array<{ name: string }>;
}

interface CallEngineNerParams {
  baseUrl: string;
  documentId: string;
  title: string;
  content: string;
  metadata?: EngineNerMetadata;
}

function flattenMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, string> | undefined {
  if (!metadata) {
    return;
  }
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value == null) {
      continue;
    }
    flat[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return Object.keys(flat).length > 0 ? flat : undefined;
}

async function callEngineNer(
  params: CallEngineNerParams
): Promise<EngineEntity[]> {
  const response = await fetch(
    `${params.baseUrl}/v1/entities/extract/document`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: params.documentId,
        title: params.title,
        content: params.content.slice(0, NER_MAX_CONTENT_LENGTH),
        author: params.metadata?.author,
        author_email: params.metadata?.authorEmail,
        connector_type: params.metadata?.connectorType,
        connector_metadata: flattenMetadata(params.metadata?.connectorMetadata),
        participants: params.metadata?.participants,
        assignees: params.metadata?.assignees,
        reviewers: params.metadata?.reviewers,
        labels: params.metadata?.labels,
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { entities?: EngineEntityRaw[] };
  return (data.entities ?? []).map(normalizeEngineEntity);
}

async function resolveEntity(
  db: Database,
  teamId: string,
  entity: EngineEntity
) {
  const normalizedName = entity.text.trim().toLowerCase();
  const entityType = mapEntityType(entity.type);

  const existing = await db.entity.findFirst({
    where: { teamId, type: entityType, normalizedName },
    select: { id: true },
  });

  if (existing) {
    await db.entity.update({
      where: { id: existing.id },
      data: { lastActiveAt: new Date() },
    });
    return existing;
  }

  if (entityType === "PERSON") {
    const byAlias = await db.entity.findFirst({
      where: { teamId, type: "PERSON", aliases: { has: normalizedName } },
      select: { id: true },
    });
    if (byAlias) {
      await db.entity.update({
        where: { id: byAlias.id },
        data: { lastActiveAt: new Date() },
      });
      return byAlias;
    }
  }

  const aliases: string[] = [];
  if (entityType === "PERSON" && normalizedName.includes("@")) {
    const localPart = normalizedName.split("@")[0];
    if (localPart) {
      aliases.push(localPart);
      const expanded = localPart.replace(/[._-]/g, " ").trim();
      if (expanded !== localPart) {
        aliases.push(expanded);
      }
    }
  }

  return db.entity.create({
    data: {
      teamId,
      name: entity.text.trim(),
      normalizedName,
      type: entityType,
      aliases,
      mentionCount: 0,
      documentCount: 0,
      lastActiveAt: new Date(),
    },
  });
}

const ENTITY_TYPE_MAP: Record<string, EntityType> = {
  person: "PERSON",
  per: "PERSON",
  team: "TEAM",
  group: "TEAM",
  org: "ORGANIZATION",
  organization: "ORGANIZATION",
  company: "ORGANIZATION",
  loc: "LOCATION",
  location: "LOCATION",
  gpe: "LOCATION",
  technology: "TECHNOLOGY",
  tech: "TECHNOLOGY",
  project: "PROJECT",
  repo: "REPOSITORY",
  repository: "REPOSITORY",
  "code repository": "REPOSITORY",
  channel: "CHANNEL",
  slack_channel: "CHANNEL",
  "communication channel": "CHANNEL",
  topic: "TOPIC",
  customer: "CUSTOMER",
  account: "CUSTOMER",
  client: "CUSTOMER",
  product: "PRODUCT",
  service: "PRODUCT",
  event: "EVENT",
  milestone: "EVENT",
  release: "EVENT",
  sprint: "EVENT",
  deadline: "EVENT",
  ticket: "TICKET",
  issue: "TICKET",
  incident: "TICKET",
};

function mapEntityType(engineType: string): EntityType {
  if (!engineType) {
    return "TOPIC";
  }
  return ENTITY_TYPE_MAP[engineType.toLowerCase()] ?? "TOPIC";
}
