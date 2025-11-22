import type { Database } from "../index";

export interface TriggerSyncInput {
  connectorId: string;
  type: "FULL" | "INCREMENTAL";
}

export interface TriggerSyncResult {
  syncJobId: string;
  syncHistoryId: string;
  type: "FULL" | "INCREMENTAL";
}

/**
 * Create a sync job and history record
 */
export const triggerSync = async (
  db: Database,
  input: TriggerSyncInput
): Promise<TriggerSyncResult> => {
  // Create sync job
  const syncJob = await db.syncJob.create({
    data: {
      connectorId: input.connectorId,
      type: input.type,
      trigger: "MANUAL",
      status: "SYNCING",
    },
  });

  // Create sync history record
  const syncHistory = await db.syncHistory.create({
    data: {
      syncJobId: syncJob.id,
      connectorId: input.connectorId,
      status: "SYNCING",
      startedAt: new Date(),
    },
  });

  // Update connector status to syncing
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
