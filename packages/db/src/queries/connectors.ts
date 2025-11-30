import type {
  AppType,
  Connector,
  OAuthProvider,
} from "../../prisma/generated/client";
import type { Database } from "../index";
import { decryptIfEncrypted } from "../lib/encryption";

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

export type ConnectorWithOAuth = Connector & {
  oauthProvider: OAuthProvider | null;
};

export const getConnectorForSync = async (
  db: Database,
  connectorId: string
): Promise<ConnectorWithOAuth | null> =>
  db.connector.findUnique({
    where: { id: connectorId },
    include: { oauthProvider: true },
  });

export interface DecryptedOAuthCredentials {
  accessToken: string | null;
  refreshToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
  tokenType: string | null;
  isExpired: boolean;
  expiresInSeconds: number | null;
}

export const getDecryptedOAuthCredentials = async (
  db: Database,
  connectorId: string
): Promise<DecryptedOAuthCredentials | null> => {
  const oauth = await db.oAuthProvider.findUnique({
    where: { connectorId },
  });

  if (!oauth) {
    return null;
  }

  const accessToken = decryptIfEncrypted(
    oauth.accessToken,
    oauth.accessTokenIv
  );
  const refreshToken = decryptIfEncrypted(
    oauth.refreshToken,
    oauth.refreshTokenIv
  );
  const clientSecret = decryptIfEncrypted(
    oauth.clientSecret,
    oauth.clientSecretIv
  );

  // Calculate expiration
  const now = Date.now();
  const expiresAt = oauth.tokenExpiresAt?.getTime() ?? null;
  const isExpired = expiresAt ? now >= expiresAt : false;
  const expiresInSeconds = expiresAt
    ? Math.max(0, Math.floor((expiresAt - now) / 1000))
    : null;

  return {
    accessToken,
    refreshToken,
    clientId: oauth.clientId,
    clientSecret,
    tokenExpiresAt: oauth.tokenExpiresAt,
    scopes: oauth.tokenScopes ?? oauth.oauthScopes ?? [],
    tokenType: oauth.tokenType,
    isExpired,
    expiresInSeconds,
  };
};

export const isTokenExpiringSoon = async (
  db: Database,
  connectorId: string,
  bufferSeconds = 300 // Default 5 minutes
): Promise<boolean> => {
  const oauth = await db.oAuthProvider.findUnique({
    where: { connectorId },
    select: { tokenExpiresAt: true },
  });

  if (!oauth?.tokenExpiresAt) {
    return false;
  }

  const expiresAt = oauth.tokenExpiresAt.getTime();
  const bufferMs = bufferSeconds * 1000;

  return Date.now() >= expiresAt - bufferMs;
};

export const getConnectorsNeedingRefresh = async (
  db: Database,
  bufferSeconds = 300
): Promise<{ connectorId: string; app: AppType }[]> => {
  const threshold = new Date(Date.now() + bufferSeconds * 1000);

  const expiring = await db.oAuthProvider.findMany({
    where: {
      tokenExpiresAt: {
        lte: threshold,
      },
      refreshToken: {
        not: null,
      },
      connector: {
        status: {
          in: ["ACTIVE", "SYNCING"],
        },
      },
    },
    select: {
      connectorId: true,
      app: true,
    },
  });

  return expiring;
};
