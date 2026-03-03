import type { Database } from "@openplane/db";
import { createEntityChange } from "@openplane/db";
import { Context } from "@temporalio/activity";
import type {
  EntityMention,
  UpdateCoOccurrenceEdgesInput,
  UpdateCoOccurrenceEdgesOutput,
} from "./types";

export interface UpdateCoOccurrenceEdgesDependencies {
  db: Database;
}

const CO_OCCURRENCE_THRESHOLD = 2;

type SupportedRelationType =
  | "COLLABORATES_WITH"
  | "WORKS_ON"
  | "EXPERT_IN"
  | "USES"
  | "OWNS"
  | "MEMBER_OF"
  | "ASSIGNED_TO"
  | "CUSTOMER_OF"
  | "MILESTONE_FOR"
  | "FILED_IN"
  | "RELATES_TO";

const RELATION_TYPE_MAP: Record<string, SupportedRelationType> = {
  "PERSON:PERSON": "COLLABORATES_WITH",
  "PERSON:TEAM": "MEMBER_OF",
  "PERSON:PROJECT": "WORKS_ON",
  "PERSON:TECHNOLOGY": "EXPERT_IN",
  "PERSON:ORGANIZATION": "MEMBER_OF",
  "PERSON:CUSTOMER": "WORKS_ON",
  "PERSON:PRODUCT": "WORKS_ON",
  "PERSON:TICKET": "ASSIGNED_TO",
  "PERSON:EVENT": "WORKS_ON",
  "TICKET:PERSON": "ASSIGNED_TO",
  "TEAM:PROJECT": "OWNS",
  "TEAM:PRODUCT": "OWNS",
  "TEAM:TECHNOLOGY": "USES",
  "TEAM:CUSTOMER": "WORKS_ON",
  "PROJECT:TECHNOLOGY": "USES",
  "PROJECT:PRODUCT": "RELATES_TO",
  "PROJECT:TICKET": "FILED_IN",
  "PROJECT:EVENT": "MILESTONE_FOR",
  "TICKET:PROJECT": "FILED_IN",
  "EVENT:PROJECT": "MILESTONE_FOR",
  "ORGANIZATION:TECHNOLOGY": "USES",
  "ORGANIZATION:PRODUCT": "OWNS",
  "CUSTOMER:PRODUCT": "CUSTOMER_OF",
  "CUSTOMER:TICKET": "FILED_IN",
  "PRODUCT:CUSTOMER": "CUSTOMER_OF",
  "PRODUCT:TECHNOLOGY": "USES",
  "PRODUCT:TICKET": "RELATES_TO",
};

export function createUpdateCoOccurrenceEdgesActivity(
  deps: UpdateCoOccurrenceEdgesDependencies
) {
  return async function updateCoOccurrenceEdges(
    input: UpdateCoOccurrenceEdgesInput
  ): Promise<UpdateCoOccurrenceEdgesOutput> {
    const mentionsByDoc = groupMentionsByDocument(input.entityMentions);
    const pairCounts = countCoOccurrences(mentionsByDoc);

    let edgesCreated = 0;
    let edgesUpdated = 0;
    let processed = 0;
    const totalPairs = pairCounts.size;

    for (const [pairKey, count] of pairCounts) {
      if (count < CO_OCCURRENCE_THRESHOLD) {
        continue;
      }

      const [entityAId, entityBId, relationType] = pairKey.split("|");
      if (!(entityAId && entityBId && relationType)) {
        continue;
      }

      const existing = await deps.db.entityRelation.findFirst({
        where: {
          OR: [
            {
              fromEntityId: entityAId,
              toEntityId: entityBId,
              relationType: relationType as SupportedRelationType,
            },
            {
              fromEntityId: entityBId,
              toEntityId: entityAId,
              relationType: relationType as SupportedRelationType,
            },
          ],
        },
      });

      const supportCount = await getPairSupportCount(
        deps.db,
        input.teamId,
        entityAId,
        entityBId
      );
      const confidence = Math.min(1.0, supportCount / 10);

      if (existing) {
        const oldWeight = existing.weight;
        const newWeight = supportCount;
        await deps.db.entityRelation.update({
          where: { id: existing.id },
          data: {
            weight: newWeight,
            confidence,
          },
        });

        if (oldWeight !== newWeight) {
          await createEntityChange(deps.db, {
            teamId: input.teamId,
            entityId: existing.fromEntityId,
            field: "relation.weight",
            oldValue: oldWeight,
            newValue: newWeight,
            source: "INFERENCE_PIPELINE",
          });
        }

        edgesUpdated += 1;
      } else {
        await deps.db.entityRelation.create({
          data: {
            fromEntityId: entityAId,
            toEntityId: entityBId,
            relationType: relationType as SupportedRelationType,
            weight: supportCount,
            confidence,
            evidence: [`co-occurrence:${supportCount}`],
          },
        });
        edgesCreated += 1;
      }

      processed += 1;
      if (processed % 100 === 0) {
        Context.current().heartbeat({
          processed,
          total: totalPairs,
        });
      }
    }

    return { edgesUpdated, edgesCreated };
  };
}

function groupMentionsByDocument(
  mentions: EntityMention[]
): Map<string, EntityMention[]> {
  const grouped = new Map<string, EntityMention[]>();
  for (const mention of mentions) {
    const existing = grouped.get(mention.documentId);
    if (existing) {
      existing.push(mention);
    } else {
      grouped.set(mention.documentId, [mention]);
    }
  }
  return grouped;
}

function countCoOccurrences(
  mentionsByDoc: Map<string, EntityMention[]>
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const mentions of mentionsByDoc.values()) {
    const uniqueEntities = deduplicateEntities(mentions);

    for (let i = 0; i < uniqueEntities.length; i++) {
      for (let j = i + 1; j < uniqueEntities.length; j++) {
        const a = uniqueEntities[i];
        const b = uniqueEntities[j];
        if (!(a && b)) {
          continue;
        }

        const [first, second] = a.entityId < b.entityId ? [a, b] : [b, a];
        if (!(first && second)) {
          continue;
        }

        const relationType = inferRelationType(
          first.entityType,
          second.entityType
        );

        const key = `${first.entityId}|${second.entityId}|${relationType}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  return counts;
}

function deduplicateEntities(mentions: EntityMention[]): EntityMention[] {
  const seen = new Map<string, EntityMention>();
  for (const mention of mentions) {
    const existing = seen.get(mention.entityId);
    if (!existing || mention.confidence > existing.confidence) {
      seen.set(mention.entityId, mention);
    }
  }
  return Array.from(seen.values());
}

function inferRelationType(
  typeA: string,
  typeB: string
): SupportedRelationType {
  const key = `${typeA}:${typeB}`;
  const reverseKey = `${typeB}:${typeA}`;
  return (
    RELATION_TYPE_MAP[key] ?? RELATION_TYPE_MAP[reverseKey] ?? "RELATES_TO"
  );
}

async function getPairSupportCount(
  db: Database,
  teamId: string,
  entityAId: string,
  entityBId: string
): Promise<number> {
  const [firstEntityId, secondEntityId] =
    entityAId < entityBId ? [entityAId, entityBId] : [entityBId, entityAId];

  const result = await db.$queryRaw<Array<{ co_count: bigint }>>`
    SELECT COUNT(DISTINCT m1.document_id) AS co_count
    FROM entity_mention m1
    JOIN entity_mention m2
      ON m1.document_id = m2.document_id
      AND m1.team_id = m2.team_id
    WHERE m1.team_id = ${teamId}
      AND m1.entity_id = ${firstEntityId}
      AND m2.entity_id = ${secondEntityId}
  `;

  return Number(result[0]?.co_count ?? 0);
}
