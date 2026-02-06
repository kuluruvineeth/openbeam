import type { Database } from "@openplane/db";
import {
  DecayScoresInputSchema,
  type DecayScoresOutput,
} from "@openplane/types/temporal/activities/knowledge";
import { Context } from "@temporalio/activity";

const PRUNE_THRESHOLD = 0.001;

export interface DecayScoresDependencies {
  db: Database;
}

export function createDecayScoresActivity(deps: DecayScoresDependencies) {
  return async function decayScores(
    rawInput: unknown
  ): Promise<DecayScoresOutput> {
    const input = DecayScoresInputSchema.parse(rawInput);
    const halfLife = input.halfLifeDays;

    Context.current().heartbeat({ stage: "decaying_entity_scores" });

    const scoresDecayed = await deps.db.$executeRaw`
      UPDATE entity SET
        expertise_score = expertise_score * POWER(
          0.5,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(last_active_at, updated_at))) / 86400.0 / ${halfLife}::float
        ),
        updated_at = NOW()
      WHERE team_id = ${input.teamId}
        AND expertise_score > ${PRUNE_THRESHOLD}
    `;

    Context.current().heartbeat({ stage: "decaying_relation_weights" });

    const staleThresholdDays = halfLife * 2;

    await deps.db.$executeRaw`
      UPDATE entity_relation SET
        weight = weight * POWER(
          0.5,
          EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400.0 / ${halfLife}::float
        ),
        updated_at = NOW()
      FROM entity e
      WHERE entity_relation.from_entity_id = e.id
        AND e.team_id = ${input.teamId}
        AND EXTRACT(EPOCH FROM (NOW() - entity_relation.updated_at)) / 86400.0 > ${staleThresholdDays}::float
    `;

    Context.current().heartbeat({ stage: "pruning_near_zero" });

    const { count: entitiesPruned } = await deps.db.entity.updateMany({
      where: {
        teamId: input.teamId,
        expertiseScore: { gt: 0, lte: PRUNE_THRESHOLD },
      },
      data: { expertiseScore: 0 },
    });

    return { scoresDecayed, entitiesPruned };
  };
}
