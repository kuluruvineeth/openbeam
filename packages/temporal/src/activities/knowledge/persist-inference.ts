import type { Database } from "@openplane/db";
import {
  PersistInferenceInputSchema,
  type PersistInferenceOutput,
} from "@openplane/types/temporal/activities/knowledge";

export interface PersistInferenceDependencies {
  db: Database;
}

export function createPersistInferenceActivity(
  deps: PersistInferenceDependencies
) {
  return async function persistInferenceResults(
    rawInput: unknown
  ): Promise<PersistInferenceOutput> {
    const input = PersistInferenceInputSchema.parse(rawInput);

    await deps.db.entityChange.create({
      data: {
        teamId: input.teamId,
        entityId: input.inferenceRunId,
        field: "inference_run",
        newValue: {
          entitiesProcessed: input.mentionResult.entityCount,
          scoresUpdated: input.expertiseResult.scoresUpdated,
          edgesCreated: input.relationshipResult.edgesCreated,
          edgesUpdated: input.relationshipResult.edgesUpdated,
          edgesRemoved: input.relationshipResult.edgesRemoved,
          patternsDetected: input.patternResult.patternsDetected,
          clusters: input.patternResult.clusters,
          scoresDecayed: input.decayResult.scoresDecayed,
          entitiesPruned: input.decayResult.entitiesPruned,
        },
        source: "INFERENCE_PIPELINE",
        triggeredBy: input.inferenceRunId,
      },
    });

    return { persisted: true };
  };
}
