import type { Database } from "@openplane/db";
import {
  InferRelationshipsInputSchema,
  type InferRelationshipsOutput,
} from "@openplane/types/temporal/activities/knowledge";
import { Context } from "@temporalio/activity";

const ENTITY_TYPE_RELATION_MAP: Record<string, string> = {
  "PERSON:PERSON": "COLLABORATES_WITH",
  "PERSON:TECHNOLOGY": "EXPERT_IN",
  "TECHNOLOGY:PERSON": "EXPERT_IN",
  "PERSON:PROJECT": "WORKS_ON",
  "PROJECT:PERSON": "WORKS_ON",
  "PROJECT:TECHNOLOGY": "USES",
  "TECHNOLOGY:PROJECT": "USES",
};

const BATCH_SIZE = 500;

interface CoOccurrence {
  from_entity_id: string;
  to_entity_id: string;
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

    const coOccurrences = await deps.db.$queryRaw<CoOccurrence[]>`
      SELECT
        m1.entity_id AS from_entity_id,
        m2.entity_id AS to_entity_id,
        e1.type AS from_type,
        e2.type AS to_type,
        COUNT(DISTINCT m1.document_id) AS co_count
      FROM entity_mention m1
      JOIN entity_mention m2
        ON m1.document_id = m2.document_id
        AND m1.team_id = m2.team_id
        AND m1.entity_id < m2.entity_id
      JOIN entity e1 ON e1.id = m1.entity_id
      JOIN entity e2 ON e2.id = m2.entity_id
      WHERE m1.team_id = ${input.teamId}
      GROUP BY m1.entity_id, m2.entity_id, e1.type, e2.type
      HAVING COUNT(DISTINCT m1.document_id) >= ${input.coOccurrenceThreshold}
    `;

    const maxCoCount = coOccurrences.reduce(
      (max, co) => Math.max(max, Number(co.co_count)),
      1
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

        const existing = await deps.db.entityRelation.findUnique({
          where: {
            fromEntityId_toEntityId_relationType: {
              fromEntityId: co.from_entity_id,
              toEntityId: co.to_entity_id,
              relationType: relationType as never,
            },
          },
        });

        if (existing) {
          await deps.db.entityRelation.update({
            where: { id: existing.id },
            data: {
              weight: Number(co.co_count),
              confidence,
            },
          });
          edgesUpdated += 1;
        } else {
          await deps.db.entityRelation.create({
            data: {
              fromEntityId: co.from_entity_id,
              toEntityId: co.to_entity_id,
              relationType: relationType as never,
              weight: Number(co.co_count),
              confidence,
              evidence: [
                { source: "co_occurrence", count: Number(co.co_count) },
              ],
            },
          });
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
    SELECT er.id
    FROM entity_relation er
    JOIN entity e ON e.id = er.from_entity_id
    WHERE e.team_id = ${teamId}
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
