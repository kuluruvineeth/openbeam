import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorSyncStatusTool = defineTool({
  name: "connector_sync_status",
  description: `Check the status of a specific sync job triggered by connector_sync.

USE THIS WHEN:
- User wants to check progress of a sync they triggered
- Monitoring a long-running full sync
- Verifying a sync completed successfully

DO NOT USE WHEN:
- User wants general connector health (use connector_status)
- User wants to trigger a new sync (use connector_sync)
- User wants to list all connectors (use connector_list)

RETURNS: Job status including progress percentage, documents processed, and completion state.`,
  category: "connectors",
  deferLoading: true,
  searchKeywords: ["sync", "job", "progress", "status", "check"],

  parameters: z.object({
    jobId: z
      .string()
      .describe(
        "The sync job ID returned from connector_sync. Format: UUID or job identifier."
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const jobStatus = await ctx.services.connectors.getSyncJobStatus(
      params.jobId
    );

    if (!jobStatus) {
      return failure(
        "NOT_FOUND",
        `Sync job ${params.jobId} not found. The job may have expired or the ID may be incorrect.`
      );
    }

    const progressInfo = jobStatus.progress
      ? {
          documentsProcessed: jobStatus.progress.documentsProcessed,
          documentsTotal: jobStatus.progress.documentsTotal,
          percentComplete: jobStatus.progress.percentComplete,
        }
      : null;

    return success(
      {
        jobId: jobStatus.jobId,
        connectorId: jobStatus.connectorId,
        status: jobStatus.status,
        progress: progressInfo,
        startedAt: jobStatus.startedAt?.toISOString(),
        completedAt: jobStatus.completedAt?.toISOString(),
        errorMessage: jobStatus.errorMessage,
        isComplete: ["completed", "failed", "cancelled"].includes(
          jobStatus.status
        ),
        isSuccess: jobStatus.status === "completed",
      },
      { latencyMs: performance.now() - startTime, source: "queue" }
    );
  },
});
