import {
  type AppType,
  type AuthType,
  ConnectorStatus,
  type ConnectorType,
  type Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export const createConnector = async (
  db: Database,
  data: {
    organizationId: string;
    userId: string;
    app: AppType;
    workspaceExternalId: string;
    name: string;
    type: ConnectorType;
    authType: AuthType;
    config?: Prisma.InputJsonValue;
  }
) =>
  db.connector.create({
    data: {
      organizationId: data.organizationId,
      userId: data.userId,
      app: data.app,
      workspaceExternalId: data.workspaceExternalId,
      name: data.name,
      type: data.type,
      authType: data.authType,
      config: data.config ?? {},
      status: ConnectorStatus.CONNECTING,
    },
  });

export const updateConnector = async (
  db: Database,
  id: string,
  data: Prisma.ConnectorUpdateInput
) =>
  db.connector.update({
    where: { id },
    data,
  });

export const updateConnectorConfig = async (
  db: Database,
  id: string,
  config: Prisma.InputJsonValue
) =>
  db.connector.update({
    where: { id },
    data: {
      config,
    },
  });

export const deleteConnector = async (db: Database, id: string) =>
  db.connector.delete({
    where: { id },
  });
