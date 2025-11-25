/**
 * Sync Mutations
 * Enhanced sync mutations matching sync.prisma schema
 */

import type {
  Prisma,
  SyncCursor,
  SyncHistory,
  SyncJob,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface TriggerSyncInput {
  connectorId: string;
  type: "FULL" | "INCREMENTAL" | "DELTA" | "REPAIR";
}

export interface TriggerSyncResult {
  syncJobId: string;
  syncHistoryId: string;
  type: string;
}

export interface UpdateSyncSettingsInput {
  connectorId: string;
  fullSyncIntervalMs?: number;
  incrementalSyncIntervalMs?: number;
}

export interface UpdateSyncSettingsResult {
  fullSyncJob: {
    id: string;
    intervalMs: number;
    schedule: string;
    nextRunAt: Date;
  } | null;
  incrementalSyncJob: {
    id: string;
    intervalMs: number;
    schedule: string;
    nextRunAt: Date;
  } | null;
}

// ============================================================================
// Sync Trigger Mutations
// ============================================================================

/**
 * Create a sync job and history record
 */
export const triggerSync = async (
  db: Database,
  input: TriggerSyncInput
): Promise<TriggerSyncResult> => {
  const syncJob = await db.syncJob.create({
    data: {
      connectorId: input.connectorId,
      type: input.type,
      trigger: "MANUAL",
      status: "QUEUED",
      queuedAt: new Date(),
    },
  });

  const syncHistory = await db.syncHistory.create({
    data: {
      syncJobId: syncJob.id,
      connectorId: input.connectorId,
      status: "QUEUED",
      trigger: "MANUAL",
      startedAt: new Date(),
    },
  });

  await db.connector.update({
    where: { id: input.connectorId },
    data: {
      status: "SYNCING",
      statusMessage: `Starting ${input.type.toLowerCase()} sync`,
      statusChangedAt: new Date(),
    },
  });

  return {
    syncJobId: syncJob.id,
    syncHistoryId: syncHistory.id,
    type: input.type,
  };
};

/**
 * Start a sync job (update status to RUNNING)
 */
export const startSyncJob = async (
  db: Database,
  syncJobId: string,
  fenceToken?: number
): Promise<SyncJob> =>
  db.syncJob.update({
    where: { id: syncJobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      fenceToken,
    },
  });

/**
 * Complete a sync job
 */
export const completeSyncJob = async (
  db: Database,
  syncJobId: string,
  result: {
    itemsProcessed: number;
    itemsFailed: number;
  }
): Promise<SyncJob> =>
  db.syncJob.update({
    where: { id: syncJobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      progress: 1,
      itemsProcessed: result.itemsProcessed,
      itemsFailed: result.itemsFailed,
    },
  });

/**
 * Fail a sync job
 */
export const failSyncJob = async (
  db: Database,
  syncJobId: string,
  error: {
    message: string;
    code?: string;
    stack?: string;
    retry?: boolean;
  }
): Promise<SyncJob> => {
  const job = await db.syncJob.findUnique({
    where: { id: syncJobId },
    select: { retryCount: true, maxRetries: true },
  });

  const shouldRetry =
    error.retry && (job?.retryCount ?? 0) < (job?.maxRetries ?? 3);

  return db.syncJob.update({
    where: { id: syncJobId },
    data: {
      status: shouldRetry ? "PENDING" : "FAILED",
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      completedAt: shouldRetry ? null : new Date(),
      retryCount: shouldRetry ? { increment: 1 } : undefined,
      retryAfter: shouldRetry
        ? new Date(Date.now() + 2 ** ((job?.retryCount ?? 0) + 1) * 60_000)
        : null,
    },
  });
};

/**
 * Cancel a sync job
 */
export const cancelSyncJob = async (
  db: Database,
  syncJobId: string
): Promise<SyncJob> =>
  db.syncJob.update({
    where: { id: syncJobId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });

// ============================================================================
// Sync History Mutations
// ============================================================================

/**
 * Update sync history on completion
 */
export const completeSyncHistory = async (
  db: Database,
  syncHistoryId: string,
  result: {
    status: "COMPLETED" | "FAILED";
    dataAdded?: number;
    dataUpdated?: number;
    dataDeleted?: number;
    dataSkipped?: number;
    dataFailed?: number;
    errorMessage?: string;
    errorCode?: string;
    summary?: Prisma.InputJsonValue;
    resourcesSynced?: string[];
    apiCallsMade?: number;
  }
): Promise<SyncHistory> => {
  const history = await db.syncHistory.findUnique({
    where: { id: syncHistoryId },
    select: { startedAt: true },
  });

  const finishedAt = new Date();
  const durationMs = history
    ? finishedAt.getTime() - history.startedAt.getTime()
    : null;

  return db.syncHistory.update({
    where: { id: syncHistoryId },
    data: {
      status: result.status,
      finishedAt,
      durationMs,
      dataAdded: result.dataAdded ?? 0,
      dataUpdated: result.dataUpdated ?? 0,
      dataDeleted: result.dataDeleted ?? 0,
      dataSkipped: result.dataSkipped ?? 0,
      dataFailed: result.dataFailed ?? 0,
      errorMessage: result.errorMessage,
      errorCode: result.errorCode,
      summary: result.summary ?? {},
      resourcesSynced: result.resourcesSynced ?? [],
      apiCallsMade: result.apiCallsMade ?? 0,
    },
  });
};

// ============================================================================
// Sync Settings Mutations
// ============================================================================

/**
 * Update sync settings for a connector
 */
export const updateSyncSettings = async (
  db: Database,
  input: UpdateSyncSettingsInput,
  intervalMsToCron: (intervalMs: number) => string
): Promise<UpdateSyncSettingsResult> => {
  const result: UpdateSyncSettingsResult = {
    fullSyncJob: null,
    incrementalSyncJob: null,
  };

  if (input.fullSyncIntervalMs) {
    const cronExpression = intervalMsToCron(input.fullSyncIntervalMs);
    const nextRunAt = new Date(Date.now() + input.fullSyncIntervalMs);

    const existingJob = await db.syncJob.findFirst({
      where: {
        connectorId: input.connectorId,
        type: "FULL",
        trigger: "SCHEDULED",
        deletedAt: null,
      },
    });

    if (existingJob) {
      const updated = await db.syncJob.update({
        where: { id: existingJob.id },
        data: {
          schedule: cronExpression,
          nextRunAt,
          config: { intervalMs: input.fullSyncIntervalMs },
        },
      });

      result.fullSyncJob = {
        id: updated.id,
        intervalMs: input.fullSyncIntervalMs,
        schedule: cronExpression,
        nextRunAt,
      };
    } else {
      const created = await db.syncJob.create({
        data: {
          connectorId: input.connectorId,
          type: "FULL",
          trigger: "SCHEDULED",
          status: "PENDING",
          priority: 3,
          schedule: cronExpression,
          nextRunAt,
          config: { intervalMs: input.fullSyncIntervalMs },
        },
      });

      result.fullSyncJob = {
        id: created.id,
        intervalMs: input.fullSyncIntervalMs,
        schedule: cronExpression,
        nextRunAt,
      };
    }
  }

  if (input.incrementalSyncIntervalMs) {
    const cronExpression = intervalMsToCron(input.incrementalSyncIntervalMs);
    const nextRunAt = new Date(Date.now() + input.incrementalSyncIntervalMs);

    const existingJob = await db.syncJob.findFirst({
      where: {
        connectorId: input.connectorId,
        type: "INCREMENTAL",
        trigger: "SCHEDULED",
        deletedAt: null,
      },
    });

    if (existingJob) {
      const updated = await db.syncJob.update({
        where: { id: existingJob.id },
        data: {
          schedule: cronExpression,
          nextRunAt,
          config: { intervalMs: input.incrementalSyncIntervalMs },
        },
      });

      result.incrementalSyncJob = {
        id: updated.id,
        intervalMs: input.incrementalSyncIntervalMs,
        schedule: cronExpression,
        nextRunAt,
      };
    } else {
      const created = await db.syncJob.create({
        data: {
          connectorId: input.connectorId,
          type: "INCREMENTAL",
          trigger: "SCHEDULED",
          status: "PENDING",
          priority: 5,
          schedule: cronExpression,
          nextRunAt,
          config: { intervalMs: input.incrementalSyncIntervalMs },
        },
      });

      result.incrementalSyncJob = {
        id: created.id,
        intervalMs: input.incrementalSyncIntervalMs,
        schedule: cronExpression,
        nextRunAt,
      };
    }
  }

  return result;
};

// ============================================================================
// Pause/Resume (moved from connectors for consistency)
// ============================================================================

export const pauseConnector = async (
  db: Database,
  connectorId: string
): Promise<{ success: boolean; message: string }> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { status: true },
  });

  if (connector?.status === "PAUSED") {
    return { success: true, message: "Connector is already paused" };
  }

  await db.connector.update({
    where: { id: connectorId },
    data: {
      status: "PAUSED",
      statusMessage: "Paused by user",
      statusChangedAt: new Date(),
      pausedAt: new Date(),
    },
  });

  return { success: true, message: "Connector paused successfully" };
};

export const resumeConnector = async (
  db: Database,
  connectorId: string
): Promise<{ success: boolean; message: string }> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { status: true },
  });

  if (connector?.status === "ACTIVE") {
    return { success: true, message: "Connector is already active" };
  }

  await db.connector.update({
    where: { id: connectorId },
    data: {
      status: "ACTIVE",
      statusMessage: "Resumed by user",
      statusChangedAt: new Date(),
      pausedAt: null,
    },
  });

  return { success: true, message: "Connector resumed successfully" };
};

// ============================================================================
// Sync Cursor Mutations
// ============================================================================

/**
 * Upsert sync cursor
 */
export const upsertSyncCursor = async (
  db: Database,
  data: {
    connectorId: string;
    resource: string;
    resourceType?: string;
    cursor: string | null;
    cursorType?: string;
    lastDocumentId?: string;
    metadata?: Prisma.InputJsonValue;
  }
): Promise<SyncCursor> =>
  db.syncCursor.upsert({
    where: {
      connectorId_resource: {
        connectorId: data.connectorId,
        resource: data.resource,
      },
    },
    create: {
      connectorId: data.connectorId,
      resource: data.resource,
      resourceType: data.resourceType,
      cursor: data.cursor,
      cursorType: data.cursorType ?? "timestamp",
      lastDocumentId: data.lastDocumentId,
      metadata: data.metadata ?? {},
    },
    update: {
      cursor: data.cursor,
      cursorType: data.cursorType,
      lastDocumentId: data.lastDocumentId,
      lastSyncedAt: new Date(),
      metadata: data.metadata,
    },
  });

/**
 * Delete sync cursor
 */
export const deleteSyncCursor = async (
  db: Database,
  connectorId: string,
  resource: string
): Promise<boolean> => {
  try {
    await db.syncCursor.delete({
      where: { connectorId_resource: { connectorId, resource } },
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Delete all sync cursors for connector (for full resync)
 */
export const deleteAllSyncCursors = async (
  db: Database,
  connectorId: string
): Promise<number> => {
  const result = await db.syncCursor.deleteMany({
    where: { connectorId },
  });
  return result.count;
};

// ============================================================================
// Indexed Document Mutations
// ============================================================================

/**
 * Upsert indexed document
 */
export const upsertIndexedDocument = async (
  db: Database,
  data: {
    connectorId: string;
    externalId: string;
    vespaId: string;
    documentType: string;
    documentSubtype?: string;
    sourceId?: string;
    sourcePath?: string;
    parentId?: string;
    checksum?: string;
    contentLength?: number;
    title?: string;
    authorId?: string;
    createdAtSource?: Date;
    updatedAtSource?: Date;
    metadata?: Prisma.InputJsonValue;
  }
) =>
  db.indexedDocument.upsert({
    where: {
      connectorId_externalId: {
        connectorId: data.connectorId,
        externalId: data.externalId,
      },
    },
    create: data,
    update: {
      vespaId: data.vespaId,
      documentType: data.documentType,
      documentSubtype: data.documentSubtype,
      sourceId: data.sourceId,
      sourcePath: data.sourcePath,
      parentId: data.parentId,
      lastChecksum: data.checksum,
      checksum: data.checksum,
      contentLength: data.contentLength,
      title: data.title,
      authorId: data.authorId,
      updatedAtSource: data.updatedAtSource,
      metadata: data.metadata,
      syncVersion: { increment: 1 },
      deletedFromSource: false,
      deletedAt: null,
    },
  });

/**
 * Mark document as deleted from source
 */
export const markDocumentDeleted = async (
  db: Database,
  connectorId: string,
  externalId: string
) =>
  db.indexedDocument.update({
    where: { connectorId_externalId: { connectorId, externalId } },
    data: {
      deletedFromSource: true,
      deletedAt: new Date(),
    },
  });

/**
 * Delete indexed document
 */
export const deleteIndexedDocument = (
  db: Database,
  connectorId: string,
  externalId: string
) =>
  db.indexedDocument.delete({
    where: { connectorId_externalId: { connectorId, externalId } },
  });
