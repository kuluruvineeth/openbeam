import {
  type AppType,
  type AuthType,
  type Connector,
  ConnectorStatus,
  type ConnectorType,
  type Prisma,
  SyncCategory,
  SyncJobStatus,
  SyncTrigger,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateConnectorInput {
  teamId: string;
  userId: string;
  app: AppType;
  workspaceExternalId: string;
  name: string;
  type: ConnectorType;
  authType: AuthType;
  config?: Prisma.InputJsonValue;
}

export const createConnector = async (
  db: Database,
  data: CreateConnectorInput
): Promise<Connector> =>
  db.connector.create({
    data: {
      ...data,
      config: data.config ?? {},
      status: ConnectorStatus.CONNECTING,
    },
  });

export const upsertConnector = async (
  db: Database,
  data: CreateConnectorInput
): Promise<Connector> => {
  // Find existing connector for this team+app (regardless of status)
  const existing = await db.connector.findFirst({
    where: {
      teamId: data.teamId,
      app: data.app,
    },
  });

  if (existing) {
    // Reuse existing connector - reset it for new OAuth flow
    return db.connector.update({
      where: { id: existing.id },
      data: {
        authType: data.authType,
        config: data.config ?? {},
        status: ConnectorStatus.CONNECTING,
        workspaceExternalId: data.workspaceExternalId,
        name: data.name,
        lastError: null,
        lastErrorAt: null,
      },
    });
  }

  // Create new connector
  return db.connector.create({
    data: {
      ...data,
      config: data.config ?? {},
      status: ConnectorStatus.CONNECTING,
    },
  });
};

export const updateConnector = async (
  db: Database,
  id: string,
  data: Prisma.ConnectorUpdateInput
): Promise<Connector> =>
  db.connector.update({
    where: { id },
    data,
  });

export const updateConnectorConfig = async (
  db: Database,
  id: string,
  config: Prisma.InputJsonValue
): Promise<Connector> =>
  db.connector.update({
    where: { id },
    data: { config },
  });

export const deleteConnector = async (
  db: Database,
  id: string
): Promise<Connector> =>
  // Note: BullMQ repeatable jobs should be cleaned up by the caller
  // before calling this function, as we don't have access to Redis here.
  // The API router should handle BullMQ cleanup before calling this.
  db.connector.delete({
    where: { id },
  });

/**
 * Create default sync jobs for a connector
 * - FULL sync: Every 7 days (604800000ms)
 * - INCREMENTAL sync: Every 6 hours (21600000ms)
 */
export const createDefaultSyncJobs = async (
  db: Pick<Database, "syncJob">,
  connectorId: string
): Promise<void> => {
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const sixHoursMs = 6 * 60 * 60 * 1000;

  await db.syncJob.createMany({
    data: [
      {
        connectorId,
        type: SyncCategory.FULL,
        trigger: SyncTrigger.SCHEDULED,
        status: SyncJobStatus.PENDING,
        priority: 3,
        schedule: "0 0 * * 0",
        config: { intervalMs: sevenDaysMs },
        nextRunAt: new Date(now.getTime() + sevenDaysMs),
      },
      {
        connectorId,
        type: SyncCategory.INCREMENTAL,
        trigger: SyncTrigger.SCHEDULED,
        status: SyncJobStatus.PENDING,
        priority: 5,
        schedule: "0 */6 * * *",
        config: { intervalMs: sixHoursMs },
        nextRunAt: new Date(now.getTime() + sixHoursMs),
      },
    ],
  });
};

const DELETION_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

export const softDeleteConnector = async (
  db: Database,
  id: string,
  deletedBy: string
): Promise<Connector> => {
  const now = new Date();
  return await db.connector.update({
    where: { id },
    data: {
      status: ConnectorStatus.DELETING,
      deletedAt: now,
      scheduledDeletionAt: new Date(now.getTime() + DELETION_GRACE_PERIOD_MS),
      deletedBy,
    },
  });
};

export const restoreConnector = async (
  db: Database,
  id: string
): Promise<Connector> =>
  db.connector.update({
    where: { id },
    data: {
      status: ConnectorStatus.INACTIVE,
      deletedAt: null,
      scheduledDeletionAt: null,
      deletedBy: null,
    },
  });

export const hardDeleteConnector = async (
  db: Database,
  id: string
): Promise<Connector> => db.connector.delete({ where: { id } });

export const findConnectorsPendingDeletion = async (
  db: Database
): Promise<Connector[]> =>
  db.connector.findMany({
    where: {
      status: ConnectorStatus.DELETING,
      scheduledDeletionAt: { lte: new Date() },
    },
  });
