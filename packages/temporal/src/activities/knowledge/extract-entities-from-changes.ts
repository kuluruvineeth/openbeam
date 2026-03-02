import type { Database } from "@openplane/db";
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
          select: { title: true },
        });

        const vespaDoc = await deps.vespa
          .getDocument(documentId)
          .catch(() => null);
        const title = doc?.title ?? vespaDoc?.title ?? "";
        const content = vespaDoc?.content ?? vespaDoc?.content_plain ?? "";
        const nerText = [title.trim(), content.trim()]
          .filter(Boolean)
          .join("\n\n");
        if (!nerText) {
          continue;
        }

        const entities = await callEngineNer(
          deps.engineBaseUrl,
          documentId,
          title,
          content
        );

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

async function callEngineNer(
  baseUrl: string,
  documentId: string,
  title: string,
  content: string
): Promise<EngineEntity[]> {
  const response = await fetch(`${baseUrl}/v1/entities/extract/document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      doc_id: documentId,
      title,
      content: content.slice(0, NER_MAX_CONTENT_LENGTH),
    }),
    signal: AbortSignal.timeout(30_000),
  });

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
    where: {
      teamId,
      type: entityType,
      normalizedName,
    },
    select: { id: true },
  });

  if (existing) {
    await db.entity.update({
      where: { id: existing.id },
      data: {
        lastActiveAt: new Date(),
      },
    });
    return existing;
  }

  return db.entity.create({
    data: {
      teamId,
      name: entity.text.trim(),
      normalizedName,
      type: entityType,
      mentionCount: 0,
      documentCount: 0,
      lastActiveAt: new Date(),
    },
  });
}

function mapEntityType(
  engineType: string
):
  | "PERSON"
  | "TEAM"
  | "PROJECT"
  | "TOPIC"
  | "TECHNOLOGY"
  | "LOCATION"
  | "ORGANIZATION"
  | "CHANNEL"
  | "REPOSITORY" {
  const typeMap: Record<
    string,
    | "PERSON"
    | "TEAM"
    | "PROJECT"
    | "TOPIC"
    | "TECHNOLOGY"
    | "LOCATION"
    | "ORGANIZATION"
    | "CHANNEL"
    | "REPOSITORY"
  > = {
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
    product: "TECHNOLOGY",
    technology: "TECHNOLOGY",
    tech: "TECHNOLOGY",
    project: "PROJECT",
    repo: "REPOSITORY",
    repository: "REPOSITORY",
    channel: "CHANNEL",
    slack_channel: "CHANNEL",
    topic: "TOPIC",
    event: "TOPIC",
  };

  if (!engineType) {
    return "TOPIC";
  }
  return typeMap[engineType.toLowerCase()] ?? "TOPIC";
}
