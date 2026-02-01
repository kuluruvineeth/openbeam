import {
  LtrTrainingInputSchema,
  type LtrTrainingOutput,
} from "@openplane/types/temporal/workflows";
import {
  executeChild,
  proxyActivities,
  workflowInfo,
} from "@temporalio/workflow";
import type { LtrTrainingActivities } from "../../activities/ltr/types";

const ltrActivities = proxyActivities<LtrTrainingActivities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    maximumAttempts: 3,
    initialInterval: "5 seconds",
    backoffCoefficient: 2,
  },
});

const DEFAULT_MIN_SAMPLES = 100;

export async function ltrTrainingWorkflow(
  rawInput: unknown
): Promise<LtrTrainingOutput> {
  const input = LtrTrainingInputSchema.parse(rawInput);
  const { teamId, modelVersion, minSamples } = input;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = thirtyDaysAgo.toISOString();
  const toDate = now.toISOString();
  const version = modelVersion ?? `v${now.toISOString().split("T")[0]}`;
  const minRequired = minSamples ?? DEFAULT_MIN_SAMPLES;

  const isSystemWide = !teamId || teamId === "__all__";

  if (isSystemWide) {
    const teamsResult = await ltrActivities.getTeamsEligibleForTraining({
      minSamples: minRequired,
      fromDate,
      toDate,
    });

    if (teamsResult.teamIds.length === 0) {
      return {
        modelId: "",
        samplesUsed: 0,
        accuracy: 0,
        deployedAt: undefined,
      };
    }

    let totalSamples = 0;
    let successfulModels = 0;
    let lastModelId = "";

    for (const tid of teamsResult.teamIds) {
      try {
        const result = await executeChild(ltrTrainingWorkflow, {
          workflowId: `ltr-training-${tid}-${version}`,
          args: [
            {
              teamId: tid,
              modelVersion: version,
              minSamples: minRequired,
            },
          ],
        });

        if (result.modelId) {
          successfulModels += 1;
          lastModelId = result.modelId;
          totalSamples += result.samplesUsed;
        }
        // biome-ignore lint/suspicious/noEmptyBlockStatements: training failures for individual teams should not stop batch processing
      } catch {}
    }

    return {
      modelId:
        successfulModels === 1
          ? lastModelId
          : `batch-${workflowInfo().workflowId}`,
      samplesUsed: totalSamples,
      accuracy: 0,
      deployedAt: successfulModels > 0 ? Date.now() : undefined,
    };
  }

  const { count } = await ltrActivities.countTrainingSamples({
    teamId,
    fromDate,
    toDate,
  });

  if (count < minRequired) {
    return {
      modelId: "",
      samplesUsed: count,
      accuracy: 0,
      deployedAt: undefined,
    };
  }

  const { impressions, featuresByDoc } = await ltrActivities.exportTrainingData(
    {
      teamId,
      fromDate,
      toDate,
    }
  );

  const { modelId } = await ltrActivities.createLtrModel({
    teamId,
    version,
    trainingSamples: impressions.length,
    trainingQueries: impressions.length,
  });

  const trainResult = await ltrActivities.trainLtrModel({
    teamId,
    modelId,
    version,
    impressions,
    featuresByDoc,
  });

  if (!trainResult.success) {
    await ltrActivities.updateLtrModel({
      modelId,
      status: "failed",
    });

    return {
      modelId,
      samplesUsed: impressions.length,
      accuracy: 0,
      deployedAt: undefined,
    };
  }

  await ltrActivities.updateLtrModel({
    modelId,
    status: "ready",
    storagePath: trainResult.modelPath,
    metrics: trainResult.metrics,
    featureImportance: trainResult.featureImportance,
    trainingDurationMs: trainResult.trainingTimeSeconds
      ? Math.round(trainResult.trainingTimeSeconds * 1000)
      : undefined,
  });

  const accuracy =
    trainResult.metrics?.accuracy ?? trainResult.metrics?.ndcg ?? 0;

  return {
    modelId,
    samplesUsed: impressions.length,
    accuracy,
    deployedAt: Date.now(),
  };
}
