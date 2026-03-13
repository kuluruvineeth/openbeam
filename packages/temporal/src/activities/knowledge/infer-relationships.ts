import type { Database, RelationType } from "@openbeam/db";
import {
  InferRelationshipsInputSchema,
  type InferRelationshipsOutput,
} from "@openbeam/types/temporal/activities/knowledge";
import { Context } from "@temporalio/activity";

const ENTITY_TYPE_RELATION_MAP: Record<string, RelationType> = {
  "PERSON:PERSON": "COLLABORATES_WITH",
  "PERSON:TEAM": "MEMBER_OF",
  "TEAM:PERSON": "MEMBER_OF",
  "PERSON:PROJECT": "WORKS_ON",
  "PROJECT:PERSON": "WORKS_ON",
  "PERSON:TECHNOLOGY": "EXPERT_IN",
  "TECHNOLOGY:PERSON": "EXPERT_IN",
  "PERSON:ORGANIZATION": "MEMBER_OF",
  "ORGANIZATION:PERSON": "MEMBER_OF",
  "PERSON:CUSTOMER": "WORKS_ON",
  "CUSTOMER:PERSON": "WORKS_ON",
  "PERSON:PRODUCT": "WORKS_ON",
  "PRODUCT:PERSON": "WORKS_ON",
  "PERSON:TICKET": "ASSIGNED_TO",
  "TICKET:PERSON": "ASSIGNED_TO",
  "PERSON:EVENT": "WORKS_ON",
  "EVENT:PERSON": "WORKS_ON",
  "TEAM:PROJECT": "OWNS",
  "PROJECT:TEAM": "OWNS",
  "TEAM:PRODUCT": "OWNS",
  "PRODUCT:TEAM": "OWNS",
  "TEAM:TECHNOLOGY": "USES",
  "TECHNOLOGY:TEAM": "USES",
  "TEAM:CUSTOMER": "WORKS_ON",
  "CUSTOMER:TEAM": "WORKS_ON",
  "PROJECT:TECHNOLOGY": "USES",
  "TECHNOLOGY:PROJECT": "USES",
  "PROJECT:PRODUCT": "RELATES_TO",
  "PRODUCT:PROJECT": "RELATES_TO",
  "PROJECT:TICKET": "FILED_IN",
  "TICKET:PROJECT": "FILED_IN",
  "PROJECT:EVENT": "MILESTONE_FOR",
  "EVENT:PROJECT": "MILESTONE_FOR",
  "ORGANIZATION:TECHNOLOGY": "USES",
  "TECHNOLOGY:ORGANIZATION": "USES",
  "ORGANIZATION:PRODUCT": "OWNS",
  "PRODUCT:ORGANIZATION": "OWNS",
  "CUSTOMER:PRODUCT": "CUSTOMER_OF",
  "PRODUCT:CUSTOMER": "CUSTOMER_OF",
  "CUSTOMER:TICKET": "FILED_IN",
  "TICKET:CUSTOMER": "FILED_IN",
  "PRODUCT:TECHNOLOGY": "USES",
  "TECHNOLOGY:PRODUCT": "USES",
  "PRODUCT:TICKET": "RELATES_TO",
  "TICKET:PRODUCT": "RELATES_TO",
};

const BATCH_SIZE = 500;

interface CoOccurrence {
  fromEntityId: string;
  toEntityId: string;
  from_type: string;
  to_type: string;
  co_count: bigint;
}

export interface InferRelationshipsDependencies {
  db: Database;
}

export function createInferRelationshipsActivity(
  deps: InferRelationshipsDependencies
) {
  return async function inferRelationships(
    rawInput: unknown
  ): Promise<InferRelationshipsOutput> {
    const input = InferRelationshipsInputSchema.parse(rawInput);

    Context.current().heartbeat({ stage: "finding_co_occurrences" });

    const CO_OCCURRENCE_LIMIT = 10_000;

    const coOccurrences = await deps.db.$queryRaw<CoOccurrence[]>`
      SELECT
        m1."entityId" AS "fromEntityId",
        m2."entityId" AS "toEntityId",
        e1.type AS from_type,
        e2.type AS to_type,
        COUNT(DISTINCT m1."documentId") AS co_count
      FROM entity_mention m1
      JOIN entity_mention m2
        ON m1."documentId" = m2."documentId"
        AND m1."teamId" = m2."teamId"
        AND m1."entityId" < m2."entityId"
      JOIN entity e1 ON e1."_id" = m1."entityId"
      JOIN entity e2 ON e2."_id" = m2."entityId"
      WHERE m1."teamId" = ${input.teamId}
      GROUP BY m1."entityId", m2."entityId", e1.type, e2.type
      HAVING COUNT(DISTINCT m1."documentId") >= ${input.coOccurrenceThreshold}
      ORDER BY co_count DESC
      LIMIT ${CO_OCCURRENCE_LIMIT}
    `;

    const MIN_STATISTICAL_CO_COUNT = 3;
    const maxCoCount = Math.max(
      coOccurrences.reduce((max, co) => Math.max(max, Number(co.co_count)), 1),
      MIN_STATISTICAL_CO_COUNT
    );

    let edgesCreated = 0;
    let edgesUpdated = 0;

    for (let i = 0; i < coOccurrences.length; i += BATCH_SIZE) {
      const batch = coOccurrences.slice(i, i + BATCH_SIZE);

      for (const co of batch) {
        const typeKey = `${co.from_type}:${co.to_type}`;
        const relationType = ENTITY_TYPE_RELATION_MAP[typeKey];
        if (!relationType) {
          continue;
        }

        const confidence = Number(co.co_count) / maxCoCount;
        if (confidence < input.confidenceThreshold) {
          continue;
        }

        const result = await deps.db.entityRelation.upsert({
          where: {
            fromEntityId_toEntityId_relationType: {
              fromEntityId: co.fromEntityId,
              toEntityId: co.toEntityId,
              relationType,
            },
          },
          update: {
            weight: Number(co.co_count),
            confidence,
          },
          create: {
            fromEntityId: co.fromEntityId,
            toEntityId: co.toEntityId,
            relationType,
            weight: Number(co.co_count),
            confidence,
            evidence: [{ source: "co_occurrence", count: Number(co.co_count) }],
          },
        });

        if (result.updatedAt > result.createdAt) {
          edgesUpdated += 1;
        } else {
          edgesCreated += 1;
        }
      }

      Context.current().heartbeat({
        processed: Math.min(i + BATCH_SIZE, coOccurrences.length),
        total: coOccurrences.length,
      });
    }

    Context.current().heartbeat({ stage: "pruning_stale_edges" });

    const edgesRemoved = await pruneStaleEdges(deps.db, input.teamId);

    return { edgesCreated, edgesUpdated, edgesRemoved };
  };
}

async function pruneStaleEdges(db: Database, teamId: string): Promise<number> {
  const staleEdges = await db.$queryRaw<Array<{ id: string }>>`
    SELECT er."_id" AS id
    FROM entity_relation er
    JOIN entity e ON e."_id" = er."fromEntityId"
    WHERE e."teamId" = ${teamId}
      AND er.confidence <= 0
  `;

  if (staleEdges.length === 0) {
    return 0;
  }

  const { count } = await db.entityRelation.deleteMany({
    where: { id: { in: staleEdges.map((e) => e.id) } },
  });

  return count;
}
