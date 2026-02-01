import {
  type Database,
  SyncCategory,
  SyncJobStatus,
  SyncTrigger,
} from "../index";

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

export interface CreateSyncJobWithHistoryInput {
  connectorId: string;
  syncType: "FULL" | "INCREMENTAL" | "PERMISSIONS";
  trigger: "SCHEDULED" | "MANUAL" | "WEBHOOK";
}

export interface CreateSyncJobWithHistoryResult {
  syncJobId: string;
  syncHistoryId: string;
}

export const createSyncJobWithHistory = async (
  db: Database,
  input: CreateSyncJobWithHistoryInput
): Promise<CreateSyncJobWithHistoryResult> => {
  const typeMap: Record<string, SyncCategory> = {
    FULL: SyncCategory.FULL,
    INCREMENTAL: SyncCategory.INCREMENTAL,
    PERMISSIONS: SyncCategory.PERMISSIONS,
  };

  const triggerMap: Record<string, SyncTrigger> = {
    SCHEDULED: SyncTrigger.SCHEDULED,
    MANUAL: SyncTrigger.MANUAL,
    WEBHOOK: SyncTrigger.WEBHOOK,
  };

  const syncJob = await db.syncJob.create({
    data: {
      connectorId: input.connectorId,
      type: typeMap[input.syncType] ?? SyncCategory.FULL,
      trigger: triggerMap[input.trigger] ?? SyncTrigger.SCHEDULED,
      status: SyncJobStatus.RUNNING,
      startedAt: new Date(),
    },
    select: { id: true },
  });

  const syncHistory = await db.syncHistory.create({
    data: {
      syncJobId: syncJob.id,
      connectorId: input.connectorId,
      status: SyncJobStatus.RUNNING,
      trigger: triggerMap[input.trigger] ?? SyncTrigger.SCHEDULED,
      startedAt: new Date(),
    },
    select: { id: true },
  });

  return {
    syncJobId: syncJob.id,
    syncHistoryId: syncHistory.id,
  };
};

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
  documentsAdded?: number;
  documentsUpdated?: number;
  documentsRemoved?: number;
  filesDiscovered?: number;
  mediaDiscovered?: number;
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
      documentsAdded: input.documentsAdded ?? 0,
      documentsUpdated: input.documentsUpdated ?? 0,
      documentsRemoved: input.documentsRemoved ?? 0,
      filesDiscovered: input.filesDiscovered ?? 0,
      mediaDiscovered: input.mediaDiscovered ?? 0,
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
      status: "ACTIVE",
      lastSyncStatus: "FAILED",
      lastError: input.errorMessage,
      lastErrorAt: new Date(),
      retryCount: { increment: 1 },
    },
  });

export type SyncStage =
  | "INITIALIZING"
  | "FETCHING"
  | "TRANSFORMING"
  | "INDEXING"
  | "FINALIZING"
  | "COMPLETED"
  | "FAILED";

export interface SyncProgressUpdate {
  syncHistoryId: string;
  stage: SyncStage;
  processedCount: number;
  indexedCount?: number;
  totalCount?: number;
  currentBatch?: number;
  totalBatches?: number;
  currentResource?: string;
  message?: string;
}

export interface SyncProgressSnapshot {
  syncHistoryId: string;
  stage: SyncStage;
  processedCount: number;
  totalCount: number | null;
  progressPercent: number | null;
  currentBatch: number | null;
  totalBatches: number | null;
  currentResource: string | null;
  message: string | null;
  startedAt: Date;
  updatedAt: Date;
  estimatedRemainingMs: number | null;
}

export const updateSyncProgress = async (
  db: Database,
  input: SyncProgressUpdate
): Promise<void> => {
  const progressData = {
    stage: input.stage,
    processedCount: input.processedCount,
    indexedCount: input.indexedCount ?? 0,
    totalCount: input.totalCount ?? null,
    currentBatch: input.currentBatch ?? null,
    totalBatches: input.totalBatches ?? null,
    currentResource: input.currentResource ?? null,
    message: input.message ?? null,
    progressUpdatedAt: new Date(),
  };

  await db.syncHistory.update({
    where: { id: input.syncHistoryId },
    data: {
      dataAdded: input.indexedCount ?? 0,
      documentsAdded: input.indexedCount ?? 0,
      summary: progressData,
    },
  });
};

export const getSyncProgress = async (
  db: Database,
  syncHistoryId: string
): Promise<SyncProgressSnapshot | null> => {
  const history = await db.syncHistory.findUnique({
    where: { id: syncHistoryId },
    select: {
      id: true,
      startedAt: true,
      dataAdded: true,
      summary: true,
    },
  });

  if (!history) {
    return null;
  }

  const summary = history.summary as {
    stage?: SyncStage;
    processedCount?: number;
    totalCount?: number | null;
    currentBatch?: number | null;
    totalBatches?: number | null;
    currentResource?: string | null;
    message?: string | null;
    progressUpdatedAt?: string;
  } | null;

  const processedCount = summary?.processedCount ?? history.dataAdded ?? 0;
  const totalCount = summary?.totalCount ?? null;
  const progressPercent =
    totalCount && totalCount > 0
      ? Math.round((processedCount / totalCount) * 100)
      : null;

  const startedAt = history.startedAt;
  const updatedAt = summary?.progressUpdatedAt
    ? new Date(summary.progressUpdatedAt)
    : startedAt;

  const elapsedMs = updatedAt.getTime() - startedAt.getTime();
  const estimatedRemainingMs =
    progressPercent && progressPercent > 0 && progressPercent < 100
      ? Math.round((elapsedMs / progressPercent) * (100 - progressPercent))
      : null;

  return {
    syncHistoryId,
    stage: summary?.stage ?? "INITIALIZING",
    processedCount,
    totalCount,
    progressPercent,
    currentBatch: summary?.currentBatch ?? null,
    totalBatches: summary?.totalBatches ?? null,
    currentResource: summary?.currentResource ?? null,
    message: summary?.message ?? null,
    startedAt,
    updatedAt,
    estimatedRemainingMs,
  };
};

export interface BatchProgressUpdate {
  syncHistoryId: string;
  batchNumber: number;
  totalBatches: number;
  itemsInBatch: number;
  resource: string;
}

export const recordBatchProgress = async (
  db: Database,
  input: BatchProgressUpdate
): Promise<void> => {
  const history = await db.syncHistory.findUnique({
    where: { id: input.syncHistoryId },
    select: { dataAdded: true, summary: true },
  });

  const currentProcessed = history?.dataAdded ?? 0;
  const newProcessedCount = currentProcessed + input.itemsInBatch;

  const existingSummary = (history?.summary as Record<string, unknown>) ?? {};

  await db.syncHistory.update({
    where: { id: input.syncHistoryId },
    data: {
      dataAdded: newProcessedCount,
      summary: {
        ...existingSummary,
        stage: "INDEXING" as SyncStage,
        processedCount: newProcessedCount,
        currentBatch: input.batchNumber,
        totalBatches: input.totalBatches,
        currentResource: input.resource,
        progressUpdatedAt: new Date().toISOString(),
      },
    },
  });
};

export interface ActiveSyncInfo {
  syncHistoryId: string;
  connectorId: string;
  connectorName: string;
  connectorType: string;
  stage: SyncStage;
  processedCount: number;
  progressPercent: number | null;
  startedAt: Date;
  elapsedMs: number;
}

export const getActiveSyncs = async (
  db: Database,
  teamId: string
): Promise<ActiveSyncInfo[]> => {
  const activeSyncs = await db.syncHistory.findMany({
    where: {
      status: "RUNNING",
      connector: { teamId },
    },
    select: {
      id: true,
      connectorId: true,
      startedAt: true,
      dataAdded: true,
      summary: true,
      connector: {
        select: {
          name: true,
          app: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const now = Date.now();

  return activeSyncs.map((sync) => {
    const summary = sync.summary as {
      stage?: SyncStage;
      processedCount?: number;
      totalCount?: number | null;
    } | null;

    const processedCount = summary?.processedCount ?? sync.dataAdded ?? 0;
    const totalCount = summary?.totalCount ?? null;
    const progressPercent =
      totalCount && totalCount > 0
        ? Math.round((processedCount / totalCount) * 100)
        : null;

    return {
      syncHistoryId: sync.id,
      connectorId: sync.connectorId,
      connectorName: sync.connector.name,
      connectorType: sync.connector.app,
      stage: summary?.stage ?? "INITIALIZING",
      processedCount,
      progressPercent,
      startedAt: sync.startedAt,
      elapsedMs: now - sync.startedAt.getTime(),
    };
  });
};
