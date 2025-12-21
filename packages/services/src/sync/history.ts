import type { Database } from "@openplane/db";
import {
  completeSyncHistory,
  createSyncHistory,
  failSyncHistory,
  findScheduledSyncJob,
  getSyncHistoryById,
  getSyncJobWithConfig,
  triggerWebhookSync,
  updateSyncHistoryStatus,
  updateSyncJobFenceToken,
  updateSyncJobNextRun,
} from "@openplane/db";
import type {
  CreateSyncHistoryResult,
  ServiceCreateSyncHistoryInput,
  SyncSummary,
} from "./types";

export async function createSyncHistoryForRepeatableJob(
  db: Database,
  input: ServiceCreateSyncHistoryInput
): Promise<CreateSyncHistoryResult> {
  const syncJob = await findScheduledSyncJob(db, input.connectorId, input.type);

  if (!syncJob) {
    throw new Error(
      `No scheduled ${input.type} sync job found for connector ${input.connectorId}`
    );
  }

  const syncHistory = await createSyncHistory(db, {
    syncJobId: syncJob.id,
    connectorId: input.connectorId,
  });

  return {
    syncHistoryId: syncHistory.id,
    syncJobId: syncJob.id,
  };
}

export async function createSyncHistoryForWebhook(
  db: Database,
  input: ServiceCreateSyncHistoryInput
): Promise<CreateSyncHistoryResult> {
  const result = await triggerWebhookSync(db, {
    connectorId: input.connectorId,
    type: input.type,
  });

  return {
    syncHistoryId: result.syncHistoryId,
    syncJobId: result.syncJobId,
  };
}

export async function prepareSyncHistory(
  db: Database,
  syncHistoryId: string,
  fenceToken: number
): Promise<{ syncJobId: string }> {
  const syncHistory = await getSyncHistoryById(db, syncHistoryId);

  if (!syncHistory) {
    throw new Error(`SyncHistory ${syncHistoryId} not found`);
  }

  await updateSyncHistoryStatus(db, {
    syncHistoryId,
    status: "RUNNING",
  });

  await updateSyncJobFenceToken(db, {
    syncJobId: syncHistory.syncJobId,
    fenceToken,
  });

  return { syncJobId: syncHistory.syncJobId };
}

export async function completeSyncHistoryRecord(
  db: Database,
  syncHistoryId: string,
  summary: SyncSummary,
  durationMs: number
): Promise<void> {
  const syncHistory = await getSyncHistoryById(db, syncHistoryId);

  if (!syncHistory) {
    return;
  }

  await completeSyncHistory(db, {
    syncHistoryId,
    summary,
    durationMs,
  });

  const syncJob = await getSyncJobWithConfig(db, syncHistory.syncJobId);

  if (!syncJob) {
    return;
  }

  const config = syncJob.config as { intervalMs?: number } | null;
  const intervalMs = config?.intervalMs;
  const nextRunAt = intervalMs ? new Date(Date.now() + intervalMs) : null;

  await updateSyncJobNextRun(db, {
    syncJobId: syncHistory.syncJobId,
    lastRanAt: new Date(),
    nextRunAt,
  });
}

export async function markSyncHistoryFailed(
  db: Database,
  syncHistoryId: string,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  await failSyncHistory(db, {
    syncHistoryId,
    errorMessage,
  });
}
