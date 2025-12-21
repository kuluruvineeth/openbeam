import { type Database, SyncJobStatus, SyncTrigger } from "../index";

export interface TriggerSyncInput {
  connectorId: string;
  type: "FULL" | "INCREMENTAL";
}

export interface TriggerSyncResult {
  syncJobId: string;
  syncHistoryId: string;
  type: "FULL" | "INCREMENTAL";
}

export const triggerSync = async (
  db: Database,
  input: TriggerSyncInput
): Promise<TriggerSyncResult> => {
  const syncJob = await db.syncJob.create({
    data: {
      connectorId: input.connectorId,
      type: input.type,
      trigger: "MANUAL",
      status: SyncJobStatus.RUNNING,
    },
  });

  const syncHistory = await db.syncHistory.create({
    data: {
      syncJobId: syncJob.id,
      connectorId: input.connectorId,
      status: SyncJobStatus.RUNNING,
      trigger: SyncTrigger.MANUAL,
      startedAt: new Date(),
    },
  });

  await db.connector.update({
    where: { id: input.connectorId },
    data: { status: "SYNCING" },
  });

  return {
    syncJobId: syncJob.id,
    syncHistoryId: syncHistory.id,
    type: input.type,
  };
};

export interface TriggerWebhookSyncInput {
  connectorId: string;
  type: "FULL" | "INCREMENTAL" | "PERMISSIONS";
}

export interface TriggerWebhookSyncResult {
  syncJobId: string;
  syncHistoryId: string;
}

export const triggerWebhookSync = async (
  db: Database,
  input: TriggerWebhookSyncInput
): Promise<TriggerWebhookSyncResult> => {
  const syncJob = await db.syncJob.create({
    data: {
      connectorId: input.connectorId,
      type: input.type,
      trigger: "WEBHOOK",
      status: SyncJobStatus.RUNNING,
    },
  });

  const syncHistory = await db.syncHistory.create({
    data: {
      syncJobId: syncJob.id,
      connectorId: input.connectorId,
      status: SyncJobStatus.RUNNING,
      trigger: SyncTrigger.WEBHOOK,
      startedAt: new Date(),
    },
  });

  return {
    syncJobId: syncJob.id,
    syncHistoryId: syncHistory.id,
  };
};

/**
 * Pause a connector (set status to INACTIVE)
 */
export const pauseConnector = async (
  db: Database,
  connectorId: string
): Promise<{ success: boolean; message: string }> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { status: true },
  });

  if (connector?.status === "INACTIVE") {
    return {
      success: true,
      message: "Connector is already inactive",
    };
  }

  await db.connector.update({
    where: { id: connectorId },
    data: { status: "INACTIVE" },
  });

  return {
    success: true,
    message: "Connector paused successfully",
  };
};

/**
 * Resume a connector (set status to ACTIVE)
 */
export const resumeConnector = async (
  db: Database,
  connectorId: string
): Promise<{ success: boolean; message: string }> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { status: true },
  });

  if (connector?.status === "ACTIVE") {
    return {
      success: true,
      message: "Connector is already active",
    };
  }

  await db.connector.update({
    where: { id: connectorId },
    data: { status: "ACTIVE" },
  });

  return {
    success: true,
    message: "Connector resumed successfully",
  };
};

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

/**
 * Update sync settings for a connector
 * Updates or creates sync jobs with new intervals
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

  // Update full sync job if interval provided
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
      // Update existing job
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
      // Create new job
      const created = await db.syncJob.create({
        data: {
          connectorId: input.connectorId,
          type: "FULL",
          trigger: "SCHEDULED",
          status: SyncJobStatus.PENDING,
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

  // Update incremental sync job if interval provided
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
      // Update existing job
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
      // Create new job
      const created = await db.syncJob.create({
        data: {
          connectorId: input.connectorId,
          type: "INCREMENTAL",
          trigger: "SCHEDULED",
          status: SyncJobStatus.PENDING,
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

export const updateSyncJobSchedule = async (
  db: Database,
  id: string,
  schedule: string,
  nextRunAt?: Date
): Promise<void> => {
  await db.syncJob.update({
    where: { id },
    data: { schedule, ...(nextRunAt && { nextRunAt }) },
  });
};

export const updateSyncJobNextRunAt = async (
  db: Database,
  id: string,
  nextRunAt: Date
): Promise<void> => {
  await db.syncJob.update({
    where: { id },
    data: { nextRunAt },
  });
};

export const updateConnectorWebhookConfig = async (
  db: Database,
  connectorId: string,
  config: { enabled: boolean; lastReceivedAt?: string }
): Promise<void> => {
  await db.connector.update({
    where: { id: connectorId },
    data: { webhookConfig: config },
  });
};
