import type { AppType, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export const getConnector = async (
  db: Database,
  where: Prisma.ConnectorWhereUniqueInput
) =>
  db.connector.findUnique({
    where,
    include: {
      oauthProvider: true,
    },
  });

export const getConnectorByApp = async (
  db: Database,
  organizationId: string,
  app: AppType
) =>
  db.connector.findFirst({
    where: {
      organizationId,
      app,
    },
    include: {
      oauthProvider: true,
    },
  });

export const listConnectors = async (db: Database, organizationId: string) =>
  db.connector.findMany({
    where: {
      organizationId,
    },
    include: {
      oauthProvider: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
