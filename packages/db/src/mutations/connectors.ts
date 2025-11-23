import {
  type AppType,
  type AuthType,
  type Connector,
  ConnectorStatus,
  type ConnectorType,
  type Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateConnectorInput {
  organizationId: string;
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
        type: "FULL",
        trigger: "SCHEDULED",
        status: "ACTIVE",
        priority: 3,
        schedule: "0 0 * * 0", // Weekly on Sunday at midnight
        config: { intervalMs: sevenDaysMs },
        nextRunAt: new Date(now.getTime() + sevenDaysMs),
      },
      {
        connectorId,
        type: "INCREMENTAL",
        trigger: "SCHEDULED",
        status: "ACTIVE",
        priority: 5,
        schedule: "0 */6 * * *", // Every 6 hours
        config: { intervalMs: sixHoursMs },
        nextRunAt: new Date(now.getTime() + sixHoursMs),
      },
    ],
  });
};
