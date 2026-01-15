import type {
  ConnectorHealthInfo,
  DecryptedOAuthCredentials,
  LastSyncInfo,
  SyncHistoryEntry,
} from "@openplane/types/db";
import type {
  AppType,
  Connector,
  ConnectorStatus,
  OAuthProvider,
} from "../../prisma/generated/client";
import type { Database } from "../index";
import { decryptIfEncrypted } from "../lib/encryption";

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
  bufferSeconds = 300
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

export const getConnectorIdsByTeam = async (
  db: Database,
  teamId: string
): Promise<{ id: string }[]> =>
  db.connector.findMany({
    where: { teamId },
    select: { id: true },
  });

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

export interface ConnectorWithStats extends Connector {
  documentCount: number;
  lastSync: LastSyncInfo | null;
}

export const getConnectorsWithStats = async (
  db: Database,
  teamId: string,
  statusFilter?: ConnectorStatus[]
): Promise<ConnectorWithStats[]> => {
  const connectors = await db.connector.findMany({
    where: {
      teamId,
      ...(statusFilter && statusFilter.length > 0
        ? { status: { in: statusFilter } }
        : {}),
    },
    include: {
      _count: { select: { indexedDocuments: true } },
      syncJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, createdAt: true, completedAt: true },
      },
      oauthProvider: {
        select: { tokenExpiresAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return connectors.map((c) => {
    const { _count, syncJobs, ...connector } = c;
    const lastSyncJob = syncJobs[0];
    return {
      ...connector,
      documentCount: _count.indexedDocuments,
      lastSync: lastSyncJob
        ? {
            id: lastSyncJob.id,
            status: lastSyncJob.status,
            createdAt: lastSyncJob.createdAt,
            completedAt: lastSyncJob.completedAt,
          }
        : null,
    };
  });
};

export const getConnectorHealth = async (
  db: Database,
  connectorId: string
): Promise<ConnectorHealthInfo | null> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    include: {
      _count: { select: { indexedDocuments: true } },
      oauthProvider: { select: { tokenExpiresAt: true } },
    },
  });

  if (!connector) {
    return null;
  }

  const tokenExpiresAt = connector.oauthProvider?.tokenExpiresAt ?? null;
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  const tokenExpiringSoon =
    tokenExpiresAt !== null && tokenExpiresAt.getTime() < fiveMinutesFromNow;

  return {
    id: connector.id,
    name: connector.name,
    app: connector.app,
    status: connector.status,
    lastSyncAt: connector.lastSyncedAt,
    lastError: connector.lastError,
    lastErrorAt: connector.lastErrorAt,
    tokenExpiresAt,
    isTokenExpiringSoon: tokenExpiringSoon,
    documentCount: connector._count.indexedDocuments,
  };
};

export const getConnectorSyncHistory = async (
  db: Database,
  connectorId: string,
  limit = 10
): Promise<SyncHistoryEntry[]> => {
  const jobs = await db.syncJob.findMany({
    where: { connectorId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      type: true,
      createdAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    status: job.status,
    type: job.type,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
  }));
};
