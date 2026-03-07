import {
  EmergenceDetectionInputSchema,
  type EmergenceDetectionOutput,
} from "@openbeam/types/temporal/workflows";
import { proxyActivities, setHandler } from "@temporalio/workflow";
import type { EmergenceDetectionActivities } from "../../activities/emergence/types";
import { currentTimestamp } from "../temporal-utils";
import { progressQuery, type SyncState } from "../types";

const emergenceActivities = proxyActivities<EmergenceDetectionActivities>({
  startToCloseTimeout: "5m",
  scheduleToCloseTimeout: "15m",
  heartbeatTimeout: "1m",
  retry: {
    initialInterval: "10s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function emergenceDetectionWorkflow(
  rawInput: unknown
): Promise<EmergenceDetectionOutput> {
  const input = EmergenceDetectionInputSchema.parse(rawInput);

  const state: SyncState = {
    processed: 0,
    indexed: 0,
    errors: 0,
    dataAdded: 0,
    dataUpdated: 0,
    dataDeleted: 0,
    stage: "initializing",
  };

  setHandler(progressQuery, () => state);

  const {
    teamId,
    analysisType = "weekly",
    minFrequency = 50,
    minSuccessRate = 0.8,
  } = input;

  const now = currentTimestamp();
  const dateRange = input.dateRange ?? {
    start: now - ONE_WEEK_MS,
    end: now,
  };

  let patternsAnalyzed = 0;
  let newPatterns = 0;
  let validatedPatterns = 0;
  const formalizationCandidates: string[] = [];

  switch (analysisType) {
    case "weekly": {
      state.stage = "loading";

      const compositionResult = await emergenceActivities.loadCompositionEvents(
        {
          teamId,
          startDate: dateRange.start,
          endDate: dateRange.end,
          limit: 10_000,
        }
      );

      state.processed = compositionResult.totalCount;

      if (compositionResult.events.length === 0) {
        state.stage = "complete";
        return {
          patternsAnalyzed: 0,
          newPatterns: 0,
          validatedPatterns: 0,
          formalizationCandidates: [],
        };
      }

      state.stage = "aggregating";
      const aggregateResult = await emergenceActivities.aggregatePatterns({
        events: compositionResult.events,
      });

      patternsAnalyzed = aggregateResult.patterns.length;
      newPatterns = aggregateResult.patterns.filter(
        (p) => p.status === "observed"
      ).length;

      state.stage = "analyzing";
      const candidatesResult =
        await emergenceActivities.findFormalizationCandidates({
          patterns: aggregateResult.patterns,
          minFrequency,
          minSuccessRate,
        });

      validatedPatterns = candidatesResult.candidates.length;
      formalizationCandidates.push(
        ...candidatesResult.candidates.map((c) => c.signature)
      );

      state.stage = "saving";
      await emergenceActivities.savePatterns({
        patterns: aggregateResult.patterns,
      });

      state.indexed = validatedPatterns;
      break;
    }

    case "aggregation": {
      if (!teamId) {
        throw new Error("teamId required for composition aggregation");
      }

      state.stage = "loading";
      const compositionResult = await emergenceActivities.loadCompositionEvents(
        {
          teamId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }
      );

      state.processed = compositionResult.totalCount;

      state.stage = "aggregating";
      const aggregateResult = await emergenceActivities.aggregatePatterns({
        events: compositionResult.events,
      });

      patternsAnalyzed = aggregateResult.patterns.length;
      newPatterns = aggregateResult.patterns.length;

      state.stage = "saving";
      await emergenceActivities.savePatterns({
        patterns: aggregateResult.patterns,
      });

      break;
    }

    case "validation": {
      state.stage = "loading";
      const existingResult = await emergenceActivities.loadExistingPatterns({
        teamId,
        status: "observed",
      });

      patternsAnalyzed = existingResult.patterns.length;

      const validated = existingResult.patterns.filter(
        (p) => p.status === "validated"
      );
      validatedPatterns = validated.length;
      formalizationCandidates.push(...validated.map((v) => v.signature));

      break;
    }

    default:
      throw new Error(`Unknown analysis type: ${String(analysisType)}`);
  }

  state.stage = "complete";

  return {
    patternsAnalyzed,
    newPatterns,
    validatedPatterns,
    formalizationCandidates,
  };
}
