import {
  AnalyticsExportInputSchema,
  type AnalyticsExportOutput,
} from "@openplane/types/temporal/workflows";
import {
  continueAsNew,
  executeChild,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { AnalyticsExportActivities } from "../../activities/analytics/types";
import { progressQuery, type SyncState } from "../types";

const analyticsActivities = proxyActivities<AnalyticsExportActivities>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "30m",
  heartbeatTimeout: "2m",
  retry: {
    initialInterval: "10s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

function getYesterdayDateFromTimestamp(nowMs: number): string {
  const yesterday = new Date(nowMs - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().split("T")[0] as string;
}

function formatDateRange(startDate: number, endDate: number): string {
  const start = new Date(startDate).toISOString().split("T")[0];
  const end = new Date(endDate).toISOString().split("T")[0];
  return start === end ? (start as string) : `${start}`;
}

export async function analyticsExportWorkflow(
  rawInput: unknown
): Promise<AnalyticsExportOutput> {
  const input = AnalyticsExportInputSchema.parse(rawInput);
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

  const { teamId, exportType, startDate, endDate } = input;

  const isAllTeams = !teamId || teamId === "__all__";
  const nowMs = Date.now();
  const exportDate =
    exportType === "daily"
      ? getYesterdayDateFromTimestamp(nowMs)
      : formatDateRange(startDate, endDate);

  if (isAllTeams) {
    let teamIdsToProcess: string[];
    let totalRecords = input.accumulatedRecords ?? 0;
    let processedCount = input.processedCount ?? 0;
    let errorCount = input.errorCount ?? 0;

    if (input.remainingTeamIds && input.remainingTeamIds.length > 0) {
      teamIdsToProcess = input.remainingTeamIds;
    } else {
      state.stage = "discovering";
      const teamsResult = await analyticsActivities.getTeamsWithUsage({
        date: exportDate,
      });
      teamIdsToProcess = teamsResult.teamIds;
    }

    if (teamIdsToProcess.length === 0) {
      state.stage = "complete";
      return {
        exportId: workflowInfo().workflowId,
        recordCount: totalRecords,
        storagePath: totalRecords > 0 ? `multi-team/${exportDate}` : "",
      };
    }

    state.processed = processedCount;
    state.errors = errorCount;
    state.indexed = processedCount - errorCount;

    for (let i = 0; i < teamIdsToProcess.length; i++) {
      const tid = teamIdsToProcess[i] as string;
      state.stage = `exporting:${tid}`;

      try {
        const result = await executeChild(analyticsExportWorkflow, {
          workflowId: `analytics-export-${tid}-${exportDate}`,
          args: [
            {
              teamId: tid,
              exportType,
              startDate,
              endDate,
            },
          ],
        });
        totalRecords += result.recordCount;
        state.indexed += 1;
      } catch {
        errorCount += 1;
        state.errors += 1;
      }

      processedCount += 1;
      state.processed += 1;

      if (workflowInfo().historyLength > 5000) {
        const remainingTeams = teamIdsToProcess.slice(i + 1);
        if (remainingTeams.length > 0) {
          return continueAsNew<typeof analyticsExportWorkflow>({
            teamId: "__all__",
            exportType,
            startDate,
            endDate,
            remainingTeamIds: remainingTeams,
            accumulatedRecords: totalRecords,
            processedCount,
            errorCount,
          });
        }
      }
    }

    state.stage = "complete";

    return {
      exportId: workflowInfo().workflowId,
      recordCount: totalRecords,
      storagePath: `multi-team/${exportDate}`,
    };
  }

  state.stage = "counting";
  const countResult = await analyticsActivities.countLogsForExport({
    teamId,
    date: exportDate,
  });

  if (countResult.count === 0) {
    state.stage = "complete";
    return {
      exportId: workflowInfo().workflowId,
      recordCount: 0,
      storagePath: "",
    };
  }

  state.stage = "fetching";
  const logsResult = await analyticsActivities.getLogsForExport({
    teamId,
    date: exportDate,
  });

  state.processed = logsResult.logs.length;

  state.stage = "exporting";
  const exportResult = await analyticsActivities.exportToParquet({
    teamId,
    date: exportDate,
    logs: logsResult.logs,
  });

  state.indexed = exportResult.recordCount;
  state.stage = "complete";

  return {
    exportId: workflowInfo().workflowId,
    recordCount: exportResult.recordCount,
    storagePath: exportResult.s3Key,
  };
}
