/**
 * Connector Queries
 * Enhanced connector queries matching integrations.prisma schema
 */

import type {
  AppType,
  Connector,
  ConnectorStatus,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface FindConnectorOptions {
  id?: string;
  teamId?: string;
  app?: AppType;
  includeOAuthProvider?: boolean;
}

export interface ConnectorHealth {
  id: string;
  status: ConnectorStatus;
  healthScore: number;
  lastHealthCheck: Date | null;
  consecutiveErrors: number;
  lastError: string | null;
  lastErrorAt: Date | null;
  lastErrorCode: string | null;
  errorBackoffUntil: Date | null;
}

export interface ConnectorStats {
  totalDocuments: number;
  totalMessages: number;
  totalFiles: number;
  totalEntities: number;
  lastSyncedAt: Date | null;
  lastSyncDuration: number | null;
}

export interface ConnectorWithDetails extends Connector {
  stats: ConnectorStats;
  health: ConnectorHealth;
}

// ============================================================================
// Basic Queries
// ============================================================================

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

// Legacy aliases
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

// ============================================================================
// Enhanced Queries
// ============================================================================

/**
 * Get connector with full details including stats and health
 */
export const getConnectorDetails = async (
  db: Database,
  connectorId: string,
  teamId: string
): Promise<ConnectorWithDetails | null> => {
  const connector = await db.connector.findFirst({
    where: { id: connectorId, teamId },
    include: { oauthProvider: true },
  });

  if (!connector) {
    return null;
  }

  return {
    ...connector,
    stats: {
      totalDocuments: connector.totalDocuments,
      totalMessages: connector.totalMessages,
      totalFiles: connector.totalFiles,
      totalEntities: connector.totalEntities,
      lastSyncedAt: connector.lastSyncedAt,
      lastSyncDuration: connector.lastSyncDuration,
    },
    health: {
      id: connector.id,
      status: connector.status,
      healthScore: connector.healthScore,
      lastHealthCheck: connector.lastHealthCheck,
      consecutiveErrors: connector.consecutiveErrors,
      lastError: connector.lastError,
      lastErrorAt: connector.lastErrorAt,
      lastErrorCode: connector.lastErrorCode,
      errorBackoffUntil: connector.errorBackoffUntil,
    },
  };
};

/**
 * Get connector health info
 */
export const getConnectorHealth = async (
  db: Database,
  connectorId: string
): Promise<ConnectorHealth | null> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: {
      id: true,
      status: true,
      healthScore: true,
      lastHealthCheck: true,
      consecutiveErrors: true,
      lastError: true,
      lastErrorAt: true,
      lastErrorCode: true,
      errorBackoffUntil: true,
    },
  });

  return connector;
};

/**
 * Get connectors by status
 */
export const getConnectorsByStatus = async (
  db: Database,
  teamId: string,
  status: ConnectorStatus
): Promise<Connector[]> =>
  db.connector.findMany({
    where: { teamId, status },
    include: { oauthProvider: true },
    orderBy: { updatedAt: "desc" },
  });

/**
 * Get connectors with errors
 */
export const getConnectorsWithErrors = async (
  db: Database,
  teamId: string
): Promise<Connector[]> =>
  db.connector.findMany({
    where: {
      teamId,
      OR: [
        { status: "ERROR" },
        { status: "AUTH_EXPIRED" },
        { consecutiveErrors: { gt: 0 } },
      ],
    },
    orderBy: { lastErrorAt: "desc" },
  });

/**
 * Get connector webhook configuration
 */
export const getConnectorWebhookConfig = async (
  db: Database,
  connectorId: string
): Promise<{
  webhookEnabled: boolean;
  webhookConfig: Record<string, unknown> | null;
  webhookSecret: string | null;
} | null> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: {
      webhookEnabled: true,
      webhookConfig: true,
      webhookSecret: true,
    },
  });

  if (!connector) {
    return null;
  }

  return {
    webhookEnabled: connector.webhookEnabled,
    webhookConfig: connector.webhookConfig as Record<string, unknown> | null,
    webhookSecret: connector.webhookSecret,
  };
};

/**
 * Get connector rate limit info
 */
export const getConnectorRateLimits = async (
  db: Database,
  connectorId: string
): Promise<{
  rateLimits: Record<string, unknown> | null;
  rateLimitResetAt: Date | null;
  status: ConnectorStatus;
} | null> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: {
      rateLimits: true,
      rateLimitResetAt: true,
      status: true,
    },
  });

  if (!connector) {
    return null;
  }

  return {
    rateLimits: connector.rateLimits as Record<string, unknown> | null,
    rateLimitResetAt: connector.rateLimitResetAt,
    status: connector.status,
  };
};

/**
 * Count connectors by status for team
 */
export const countConnectorsByStatus = async (
  db: Database,
  teamId: string
): Promise<Record<string, number>> => {
  const counts = await db.connector.groupBy({
    by: ["status"],
    where: { teamId },
    _count: { status: true },
  });

  return counts.reduce(
    (acc, count) => {
      acc[count.status] = count._count.status;
      return acc;
    },
    {} as Record<string, number>
  );
};

/**
 * Get connector with full details
 */
export const getConnectorWithDetails = async (
  db: Database,
  connectorId: string,
  teamId: string
) => {
  const connector = await db.connector.findFirst({
    where: { id: connectorId, teamId },
    include: { oauthProvider: true },
  });

  if (!connector) {
    return null;
  }

  return {
    ...connector,
    stats: {
      totalDocuments: connector.totalDocuments,
      totalMessages: connector.totalMessages,
      totalFiles: connector.totalFiles,
      totalEntities: connector.totalEntities,
      lastSyncedAt: connector.lastSyncedAt,
      lastSyncDuration: connector.lastSyncDuration,
    },
    health: {
      healthScore: connector.healthScore,
      lastHealthCheck: connector.lastHealthCheck,
      consecutiveErrors: connector.consecutiveErrors,
      lastError: connector.lastError,
      lastErrorAt: connector.lastErrorAt,
      lastErrorCode: connector.lastErrorCode,
      errorBackoffUntil: connector.errorBackoffUntil,
    },
  };
};

/**
 * Get connector webhook config
 */
export const getConnectorWebhook = async (
  db: Database,
  connectorId: string
) => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: {
      webhookEnabled: true,
      webhookConfig: true,
      webhookSecret: true,
    },
  });

  if (!connector) {
    return null;
  }

  return {
    webhookEnabled: connector.webhookEnabled,
    webhookConfig: connector.webhookConfig as Record<string, unknown> | null,
    webhookSecret: connector.webhookSecret,
  };
};
