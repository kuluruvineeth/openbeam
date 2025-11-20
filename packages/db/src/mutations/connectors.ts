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
  db.connector.delete({
    where: { id },
  });
