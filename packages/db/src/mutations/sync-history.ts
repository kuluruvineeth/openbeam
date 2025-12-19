import { type Database, SyncJobStatus, SyncTrigger } from "../index";

export interface CreateSyncHistoryInput {
  syncJobId: string;
  connectorId: string;
}

export const createSyncHistory = async (
  db: Database,
  input: CreateSyncHistoryInput
) =>
  db.syncHistory.create({
    data: {
      syncJobId: input.syncJobId,
      connectorId: input.connectorId,
      status: SyncJobStatus.RUNNING,
      trigger: SyncTrigger.SCHEDULED,
      startedAt: new Date(),
    },
    select: { id: true },
  });

export interface UpdateSyncHistoryStatusInput {
  syncHistoryId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
}

export const updateSyncHistoryStatus = (
  db: Database,
  input: UpdateSyncHistoryStatusInput
) => {
  const statusMap = {
    RUNNING: SyncJobStatus.RUNNING,
    COMPLETED: SyncJobStatus.COMPLETED,
    FAILED: SyncJobStatus.FAILED,
  };
  return db.syncHistory.update({
    where: { id: input.syncHistoryId },
    data: { status: statusMap[input.status] },
  });
};

export interface CompleteSyncHistoryInput {
  syncHistoryId: string;
  summary: {
    totalDocuments: number;
    batches: number;
    documentsFetched: number;
    filesQueued?: number;
    mediaQueued?: number;
  };
  durationMs: number;
}

export const completeSyncHistory = async (
  db: Database,
  input: CompleteSyncHistoryInput
) =>
  db.syncHistory.update({
    where: { id: input.syncHistoryId },
    data: {
      status: SyncJobStatus.COMPLETED,
      summary: input.summary,
      finishedAt: new Date(),
      durationMs: input.durationMs,
    },
  });

export interface FailSyncHistoryInput {
  syncHistoryId: string;
  errorMessage: string;
}

export const failSyncHistory = async (
  db: Database,
  input: FailSyncHistoryInput
) =>
  db.syncHistory.update({
    where: { id: input.syncHistoryId },
    data: {
      status: SyncJobStatus.FAILED,
      errorMessage: input.errorMessage,
      finishedAt: new Date(),
    },
  });

export interface UpdateSyncJobNextRunInput {
  syncJobId: string;
  lastRanAt: Date;
  nextRunAt: Date | null;
}

export const updateSyncJobNextRun = async (
  db: Database,
  input: UpdateSyncJobNextRunInput
) =>
  db.syncJob.update({
    where: { id: input.syncJobId },
    data: {
      lastRanAt: input.lastRanAt,
      nextRunAt: input.nextRunAt,
    },
  });

export interface UpdateSyncJobFenceTokenInput {
  syncJobId: string;
  fenceToken: number;
}

export const updateSyncJobFenceToken = async (
  db: Database,
  input: UpdateSyncJobFenceTokenInput
) =>
  db.$executeRawUnsafe(
    'UPDATE sync_job SET "fenceToken" = $1 WHERE _id = $2',
    input.fenceToken,
    input.syncJobId
  );

export interface UpsertSyncCursorInput {
  connectorId: string;
  resource: string;
  cursor: string;
}

export const upsertSyncCursor = async (
  db: Database,
  input: UpsertSyncCursorInput
) =>
  db.syncCursor.upsert({
    where: {
      connectorId_resource: {
        connectorId: input.connectorId,
        resource: input.resource,
      },
    },
    update: {
      cursor: input.cursor,
      lastSyncedAt: new Date(),
    },
    create: {
      connectorId: input.connectorId,
      resource: input.resource,
      cursor: input.cursor,
      lastSyncedAt: new Date(),
    },
  });

export interface UpdateConnectorSyncSuccessInput {
  connectorId: string;
}

export const updateConnectorSyncSuccess = async (
  db: Database,
  input: UpdateConnectorSyncSuccessInput
) =>
  db.connector.update({
    where: { id: input.connectorId },
    data: {
      lastSyncedAt: new Date(),
      lastSyncStatus: "SUCCESS",
      status: "ACTIVE",
      lastError: null,
      lastErrorAt: null,
      retryCount: 0,
    },
  });

export interface UpdateConnectorSyncErrorInput {
  connectorId: string;
  errorMessage: string;
}

export const updateConnectorSyncError = async (
  db: Database,
  input: UpdateConnectorSyncErrorInput
) =>
  db.connector.update({
    where: { id: input.connectorId },
    data: {
      lastSyncStatus: "FAILED",
      lastError: input.errorMessage,
      lastErrorAt: new Date(),
      retryCount: { increment: 1 },
    },
  });
