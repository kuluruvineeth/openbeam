import type { Database } from "@openplane/db";
import {
  ComputeExpertiseInputSchema,
  type ComputeExpertiseOutput,
} from "@openplane/types/temporal/activities/knowledge";
import { Context } from "@temporalio/activity";

export interface ComputeExpertiseDependencies {
  db: Database;
}

export function createComputeExpertiseActivity(
  deps: ComputeExpertiseDependencies
) {
  return async function computeExpertiseScores(
    rawInput: unknown
  ): Promise<ComputeExpertiseOutput> {
    const input = ComputeExpertiseInputSchema.parse(rawInput);

    Context.current().heartbeat({ stage: "computing_scores" });

    const result = await deps.db.$executeRaw`
      UPDATE entity SET
        expertise_score = subquery.new_score,
        updated_at = NOW()
      FROM (
        SELECT
          e.id,
          COALESCE(SUM(
            CASE m.source
              WHEN 'AUTHORED' THEN 3.0
              WHEN 'EDITED' THEN 2.0
              WHEN 'REVIEWED' THEN 1.5
              ELSE 1.0
            END
          ), 0) AS new_score
        FROM entity e
        LEFT JOIN entity_mention m ON m.entity_id = e.id
        WHERE e.team_id = ${input.teamId}
        GROUP BY e.id
      ) subquery
      WHERE entity.id = subquery.id
        AND entity.team_id = ${input.teamId}
    `;

    Context.current().heartbeat({ stage: "fetching_top_experts" });

    const topExperts = await deps.db.entity.findMany({
      where: {
        teamId: input.teamId,
        expertiseScore: { gt: 0 },
      },
      select: {
        id: true,
        expertiseScore: true,
        type: true,
        name: true,
        outgoingRelations: {
          where: { relationType: "EXPERT_IN" },
          select: { toEntity: { select: { name: true } } },
          take: 5,
        },
      },
      orderBy: { expertiseScore: "desc" },
      take: 20,
    });

    return {
      scoresUpdated: result,
      topExperts: topExperts.map((e) => ({
        entityId: e.id,
        score: e.expertiseScore,
        domains: e.outgoingRelations.map((r) => r.toEntity.name),
      })),
    };
  };
}
