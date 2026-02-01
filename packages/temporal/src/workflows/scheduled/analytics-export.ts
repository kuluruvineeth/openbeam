import {
  AnalyticsExportInputSchema,
  type AnalyticsExportOutput,
} from "@openplane/types/temporal/workflows";
import {
  executeChild,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { AnalyticsExportActivities } from "../../activities/analytics/types";
import { progressQuery, type SyncState } from "../types";

const analyticsActivities = proxyActivities<AnalyticsExportActivities>({
  startToCloseTimeout: "10m",
  heartbeatTimeout: "2m",
  retry: {
    initialInterval: "10s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
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
    stage: "initializing",
  };

  setHandler(progressQuery, () => state);

  const { teamId, exportType, startDate, endDate } = input;

  const isAllTeams = !teamId || teamId === "__all__";
  const exportDate =
    exportType === "daily"
      ? getYesterdayDate()
      : formatDateRange(startDate, endDate);

  if (isAllTeams) {
    state.stage = "discovering";

    const teamsResult = await analyticsActivities.getTeamsWithUsage({
      date: exportDate,
    });

    if (teamsResult.teamIds.length === 0) {
      state.stage = "complete";
      return {
        exportId: workflowInfo().workflowId,
        recordCount: 0,
        storagePath: "",
      };
    }

    let totalRecords = 0;
    const errors: string[] = [];

    for (const tid of teamsResult.teamIds) {
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
      } catch (error) {
        errors.push(
          `${tid}: ${error instanceof Error ? error.message : String(error)}`
        );
        state.errors += 1;
      }

      state.processed += 1;
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
