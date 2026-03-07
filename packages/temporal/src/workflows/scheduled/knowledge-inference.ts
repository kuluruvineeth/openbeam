import {
  KnowledgeInferenceInputSchema,
  type KnowledgeInferenceOutput,
} from "@openbeam/types/temporal/workflows/knowledge-inference";
import {
  continueAsNew,
  proxyActivities,
  workflowInfo,
} from "@temporalio/workflow";
import type { KnowledgeInferenceActivities } from "../../activities/knowledge";

const inferenceActivities = proxyActivities<KnowledgeInferenceActivities>({
  startToCloseTimeout: "10 minutes",
  heartbeatTimeout: "2 minutes",
  retry: {
    initialInterval: "5 seconds",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: "2 minutes",
    nonRetryableErrorTypes: ["AuthorizationError", "InvalidInputError"],
  },
});

const dbActivities = proxyActivities<
  Pick<KnowledgeInferenceActivities, "persistInferenceResults">
>({
  startToCloseTimeout: "2 minutes",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumAttempts: 5,
    maximumInterval: "30 seconds",
    nonRetryableErrorTypes: ["AuthorizationError", "ConstraintViolationError"],
  },
});

const DEFAULT_BATCH_SIZE = 500;

export async function knowledgeInferenceWorkflow(
  rawInput: unknown
): Promise<KnowledgeInferenceOutput> {
  const input = KnowledgeInferenceInputSchema.parse(rawInput);

  if (input.phase === "aggregate") {
    const mentionResult = await inferenceActivities.aggregateMentions({
      teamId: input.teamId,
      entityBatchOffset: input.resumeOffset ?? 0,
      batchSize: DEFAULT_BATCH_SIZE,
      sinceTimestamp: input.sinceTimestamp,
    });

    if (mentionResult.hasMore && mentionResult.nextOffset !== null) {
      return continueAsNew<typeof knowledgeInferenceWorkflow>({
        ...input,
        phase: "aggregate",
        resumeOffset: mentionResult.nextOffset,
      });
    }

    return continueAsNew<typeof knowledgeInferenceWorkflow>({
      ...input,
      phase: "finalize",
      resumeOffset: (input.resumeOffset ?? 0) + mentionResult.entityCount,
    });
  }

  const mentionResult = {
    entityCount: input.resumeOffset ?? 0,
    hasMore: false,
    nextOffset: null,
    summary: {},
  };

  if (mentionResult.entityCount === 0) {
    await dbActivities.persistInferenceResults({
      teamId: input.teamId,
      inferenceRunId: workflowInfo().workflowId,
      mentionResult,
      expertiseResult: { scoresUpdated: 0, topExperts: [] },
      relationshipResult: { edgesCreated: 0, edgesUpdated: 0, edgesRemoved: 0 },
      patternResult: { patternsDetected: 0, clusters: 0, communities: 0 },
      decayResult: { scoresDecayed: 0, entitiesPruned: 0 },
    });

    if (input.remainingTeamIds && input.remainingTeamIds.length > 0) {
      const [nextTeamId, ...rest] = input.remainingTeamIds;
      return continueAsNew<typeof knowledgeInferenceWorkflow>({
        ...input,
        phase: "aggregate",
        teamId: nextTeamId,
        remainingTeamIds: rest,
        resumeOffset: 0,
      });
    }

    return {
      teamId: input.teamId,
      entitiesProcessed: 0,
      edgesCreated: 0,
      patternsDetected: 0,
      scoresDecayed: 0,
    };
  }

  const expertiseResult = await inferenceActivities.computeExpertiseScores({
    teamId: input.teamId,
    mentionSummary: mentionResult.summary,
    decayHalfLifeDays: input.decayHalfLifeDays ?? 30,
  });

  const relationshipResult = await inferenceActivities.inferRelationships({
    teamId: input.teamId,
    coOccurrenceThreshold: input.coOccurrenceThreshold ?? 3,
    confidenceThreshold: input.confidenceThreshold ?? 0.6,
  });

  const shouldRunPatternDetection =
    input.includePatternDetection || input.inferenceType === "weekly";
  const patternResult = shouldRunPatternDetection
    ? await inferenceActivities.detectPatterns({
        teamId: input.teamId,
        entityCount: mentionResult.entityCount,
        relationshipCount: relationshipResult.edgesCreated,
      })
    : {
        patternsDetected: 0,
        clusters: 0,
        communities: 0,
      };

  const decayResult = await inferenceActivities.decayScores({
    teamId: input.teamId,
    halfLifeDays: input.decayHalfLifeDays ?? 30,
  });

  await dbActivities.persistInferenceResults({
    teamId: input.teamId,
    inferenceRunId: workflowInfo().workflowId,
    mentionResult,
    expertiseResult,
    relationshipResult,
    patternResult,
    decayResult,
  });

  if (input.remainingTeamIds && input.remainingTeamIds.length > 0) {
    const [nextTeamId, ...rest] = input.remainingTeamIds;
    return continueAsNew<typeof knowledgeInferenceWorkflow>({
      ...input,
      phase: "aggregate",
      teamId: nextTeamId,
      remainingTeamIds: rest,
      resumeOffset: 0,
    });
  }

  return {
    teamId: input.teamId,
    entitiesProcessed: mentionResult.entityCount,
    edgesCreated: relationshipResult.edgesCreated,
    patternsDetected: patternResult.patternsDetected,
    scoresDecayed: decayResult.scoresDecayed,
  };
}
