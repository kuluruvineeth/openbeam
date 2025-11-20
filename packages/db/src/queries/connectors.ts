import type { AppType, Connector } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface FindConnectorOptions {
  id?: string;
  organizationId?: string;
  app?: AppType;
  includeOAuthProvider?: boolean;
}

export const findConnectorById = async (
  db: Database,
  id: string,
  includeOAuth = false
): Promise<Connector | null> =>
  db.connector.findUnique({
    where: { id },
    include: { oauthProvider: includeOAuth },
  });

export const findConnectorByOrg = async (
  db: Database,
  organizationId: string,
  app: AppType
): Promise<Connector | null> =>
  db.connector.findFirst({
    where: { organizationId, app },
    include: { oauthProvider: true },
  });

export const listConnectorsByOrg = async (
  db: Database,
  organizationId: string
): Promise<Connector[]> =>
  db.connector.findMany({
    where: { organizationId },
    include: { oauthProvider: true },
    orderBy: { createdAt: "desc" },
  });

export const getConnectorWithCredentials = async (
  db: Database,
  connectorId: string
): Promise<Pick<Connector, "id" | "config"> | null> =>
  db.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, config: true },
  });
