import type { AppType, Connector } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface FindConnectorOptions {
  id?: string;
  teamId?: string;
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

export const findConnectorByTeam = async (
  db: Database,
  teamId: string,
  app: AppType
): Promise<Connector | null> =>
  db.connector.findFirst({
    where: { teamId, app },
    include: { oauthProvider: true },
  });

export const listConnectorsByTeam = async (
  db: Database,
  teamId: string
): Promise<Connector[]> =>
  db.connector.findMany({
    where: { teamId },
    include: { oauthProvider: true },
    orderBy: { createdAt: "desc" },
  });

// Legacy alias for backward compatibility
export const findConnectorByOrg = findConnectorByTeam;
export const listConnectorsByOrg = listConnectorsByTeam;

export const getConnectorWithCredentials = async (
  db: Database,
  connectorId: string
): Promise<Pick<Connector, "id" | "config"> | null> =>
  db.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, config: true },
  });
