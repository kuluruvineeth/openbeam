/**
 * Connector Mutations
 * Enhanced connector mutations matching integrations.prisma schema
 */

import {
  type AppType,
  type AuthType,
  type Connector,
  ConnectorStatus,
  type ConnectorType,
  type Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface CreateConnectorInput {
  teamId: string;
  userId: string;
  app: AppType;
  workspaceExternalId: string;
  name: string;
  description?: string;
  type: ConnectorType;
  authType: AuthType;
  config?: Prisma.InputJsonValue;
  syncConfig?: Prisma.InputJsonValue;
  dataResidency?: string;
}

export interface UpdateConnectorHealthInput {
  healthScore?: number;
  lastHealthCheck?: Date;
  consecutiveErrors?: number;
  lastError?: string | null;
  lastErrorAt?: Date | null;
  lastErrorCode?: string | null;
  errorBackoffUntil?: Date | null;
}

export interface UpdateConnectorWebhookInput {
  webhookEnabled?: boolean;
  webhookConfig?: Prisma.InputJsonValue;
  webhookSecret?: string;
}

// ============================================================================
// Basic Mutations
// ============================================================================

export const createConnector = async (
  db: Database,
  data: CreateConnectorInput
): Promise<Connector> =>
  db.connector.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      app: data.app,
      workspaceExternalId: data.workspaceExternalId,
      name: data.name,
      description: data.description,
      type: data.type,
      authType: data.authType,
      config: data.config ?? {},
      syncConfig: data.syncConfig ?? {},
      dataResidency: data.dataResidency,
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

// ============================================================================
// Status Mutations
// ============================================================================

/**
 * Update connector status with message
 */
export const updateConnectorStatus = async (
  db: Database,
  connectorId: string,
  status: ConnectorStatus,
  statusMessage?: string
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: {
      status,
      statusMessage,
      statusChangedAt: new Date(),
    },
  });

/**
 * Pause a connector
 */
export const pauseConnector = async (
  db: Database,
  connectorId: string
): Promise<{ success: boolean; message: string }> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { status: true },
  });

  if (connector?.status === "PAUSED") {
    return { success: true, message: "Connector is already paused" };
  }

  await db.connector.update({
    where: { id: connectorId },
    data: {
      status: "PAUSED",
      statusMessage: "Paused by user",
      statusChangedAt: new Date(),
      pausedAt: new Date(),
    },
  });

  return { success: true, message: "Connector paused successfully" };
};

/**
 * Resume a connector
 */
export const resumeConnector = async (
  db: Database,
  connectorId: string
): Promise<{ success: boolean; message: string }> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { status: true },
  });

  if (connector?.status === "ACTIVE") {
    return { success: true, message: "Connector is already active" };
  }

  await db.connector.update({
    where: { id: connectorId },
    data: {
      status: "ACTIVE",
      statusMessage: "Resumed by user",
      statusChangedAt: new Date(),
      pausedAt: null,
    },
  });

  return { success: true, message: "Connector resumed successfully" };
};

// ============================================================================
// Health & Error Mutations
// ============================================================================

/**
 * Update connector health info
 */
export const updateConnectorHealth = async (
  db: Database,
  connectorId: string,
  data: UpdateConnectorHealthInput
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: {
      ...data,
      lastHealthCheck: data.lastHealthCheck ?? new Date(),
    },
  });

/**
 * Record connector error
 */
export const recordConnectorError = async (
  db: Database,
  connectorId: string,
  error: {
    message: string;
    code?: string;
    backoffMinutes?: number;
  }
): Promise<Connector> => {
  const backoffUntil = error.backoffMinutes
    ? new Date(Date.now() + error.backoffMinutes * 60 * 1000)
    : null;

  return db.connector.update({
    where: { id: connectorId },
    data: {
      lastError: error.message,
      lastErrorAt: new Date(),
      lastErrorCode: error.code,
      consecutiveErrors: { increment: 1 },
      errorBackoffUntil: backoffUntil,
      status: "ERROR",
      statusMessage: error.message,
      statusChangedAt: new Date(),
    },
  });
};

/**
 * Clear connector errors (on successful operation)
 */
export const clearConnectorErrors = async (
  db: Database,
  connectorId: string
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: {
      consecutiveErrors: 0,
      lastError: null,
      lastErrorAt: null,
      lastErrorCode: null,
      errorBackoffUntil: null,
      status: "ACTIVE",
      statusMessage: null,
      statusChangedAt: new Date(),
    },
  });

// ============================================================================
// Webhook Mutations
// ============================================================================

/**
 * Update webhook configuration
 */
export const updateConnectorWebhook = async (
  db: Database,
  connectorId: string,
  data: UpdateConnectorWebhookInput
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data,
  });

/**
 * Enable webhook for connector
 */
export const enableConnectorWebhook = (
  db: Database,
  connectorId: string,
  secret: string,
  config?: Prisma.InputJsonValue
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: {
      webhookEnabled: true,
      webhookSecret: secret,
      webhookConfig: config ?? {},
    },
  });

/**
 * Disable webhook for connector
 */
export const disableConnectorWebhook = async (
  db: Database,
  connectorId: string
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: {
      webhookEnabled: false,
      webhookSecret: null,
    },
  });

// ============================================================================
// Stats Mutations
// ============================================================================

/**
 * Update connector stats after sync
 */
export const updateConnectorStats = async (
  db: Database,
  connectorId: string,
  stats: {
    totalDocuments?: number;
    totalMessages?: number;
    totalFiles?: number;
    totalEntities?: number;
  }
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: stats,
  });

/**
 * Increment connector stats
 */
export const incrementConnectorStats = async (
  db: Database,
  connectorId: string,
  increments: {
    documents?: number;
    messages?: number;
    files?: number;
    entities?: number;
  }
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: {
      ...(increments.documents && {
        totalDocuments: { increment: increments.documents },
      }),
      ...(increments.messages && {
        totalMessages: { increment: increments.messages },
      }),
      ...(increments.files && {
        totalFiles: { increment: increments.files },
      }),
      ...(increments.entities && {
        totalEntities: { increment: increments.entities },
      }),
    },
  });

/**
 * Update sync completion info
 */
export const updateConnectorSyncComplete = async (
  db: Database,
  connectorId: string,
  syncInfo: {
    lastSyncStatus: string;
    durationMs: number;
  }
): Promise<Connector> =>
  db.connector.update({
    where: { id: connectorId },
    data: {
      lastSyncedAt: new Date(),
      lastSyncStatus: syncInfo.lastSyncStatus,
      lastSyncDuration: syncInfo.durationMs,
      status: "ACTIVE",
      statusMessage: null,
      statusChangedAt: new Date(),
    },
  });

// ============================================================================
// Sync Job Creation
// ============================================================================

/**
 * Create default sync jobs for a connector
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
        status: "PENDING",
        priority: 3,
        schedule: "0 0 * * 0",
        config: { intervalMs: sevenDaysMs },
        nextRunAt: new Date(now.getTime() + sevenDaysMs),
      },
      {
        connectorId,
        type: "INCREMENTAL",
        trigger: "SCHEDULED",
        status: "PENDING",
        priority: 5,
        schedule: "0 */6 * * *",
        config: { intervalMs: sixHoursMs },
        nextRunAt: new Date(now.getTime() + sixHoursMs),
      },
    ],
  });
};
