import type { Database } from "@openbeam/db";
import {
  DecayScoresInputSchema,
  type DecayScoresOutput,
} from "@openbeam/types/temporal/activities/knowledge";
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

    Context.current().heartbeat({ stage: "decaying_scores" });

    const staleThresholdDays = halfLife * 2;

    const result = await deps.db.$transaction(async (tx) => {
      const scoresDecayed = await tx.$executeRaw`
        UPDATE entity SET
          "expertiseScore" = "expertiseScore" * POWER(
            0.5,
            EXTRACT(EPOCH FROM (NOW() - COALESCE("lastActiveAt", "updatedAt"))) / 86400.0 / ${halfLife}::float
          ),
          "updatedAt" = NOW()
        WHERE "teamId" = ${input.teamId}
          AND "expertiseScore" > ${PRUNE_THRESHOLD}
      `;

      await tx.$executeRaw`
        UPDATE entity_relation SET
          weight = weight * POWER(
            0.5,
            EXTRACT(EPOCH FROM (NOW() - "updatedAt")) / 86400.0 / ${halfLife}::float
          ),
          "updatedAt" = NOW()
        FROM entity e
        WHERE entity_relation."fromEntityId" = e."_id"
          AND e."teamId" = ${input.teamId}
          AND EXTRACT(EPOCH FROM (NOW() - entity_relation."updatedAt")) / 86400.0 > ${staleThresholdDays}::float
      `;

      const { count: entitiesPruned } = await tx.entity.updateMany({
        where: {
          teamId: input.teamId,
          expertiseScore: { gt: 0, lte: PRUNE_THRESHOLD },
        },
        data: { expertiseScore: 0 },
      });

      return { scoresDecayed, entitiesPruned };
    });

    return result;
  };
}
