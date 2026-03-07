import type {
  ActivateConnectorInput,
  CreateConnectorInput,
  CreateConnectorWithOAuthInput,
} from "@openbeam/types";
import {
  type Connector,
  ConnectorStatus,
  type OAuthProvider,
  type Prisma,
  SyncCategory,
  type SyncJob,
  SyncJobStatus,
  SyncTrigger,
} from "../../prisma/generated/client";
import type { Database } from "../index";
import { encryptIfConfigured } from "../lib/encryption";

export const createConnector = async (
  db: Database,
  data: CreateConnectorInput
): Promise<Connector> =>
  db.connector.create({
    data: {
      ...data,
      config: (data.config ?? {}) as Prisma.InputJsonValue,
      status: ConnectorStatus.CONNECTING,
    },
  });

export const upsertConnector = async (
  db: Database,
  data: CreateConnectorInput
): Promise<Connector> => {
  const existing = await db.connector.findFirst({
    where: {
      teamId: data.teamId,
      app: data.app,
    },
  });

  if (existing) {
    return db.connector.update({
      where: { id: existing.id },
      data: {
        authType: data.authType,
        config: (data.config ?? {}) as Prisma.InputJsonValue,
        status: ConnectorStatus.CONNECTING,
        workspaceExternalId: data.workspaceExternalId,
        name: data.name,
        lastError: null,
        lastErrorAt: null,
      },
    });
  }

  return db.connector.create({
    data: {
      ...data,
      config: (data.config ?? {}) as Prisma.InputJsonValue,
      status: ConnectorStatus.CONNECTING,
    },
  });
};

export const updateConnector = async (
  db: Pick<Database, "connector">,
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
        type: SyncCategory.FULL,
        trigger: SyncTrigger.SCHEDULED,
        status: SyncJobStatus.PENDING,
        priority: 3,
        schedule: "0 0 * * 0",
        config: { intervalMs: sevenDaysMs },
        nextRunAt: new Date(now.getTime() + sevenDaysMs),
      },
      {
        connectorId,
        type: SyncCategory.INCREMENTAL,
        trigger: SyncTrigger.SCHEDULED,
        status: SyncJobStatus.PENDING,
        priority: 5,
        schedule: "0 */6 * * *",
        config: { intervalMs: sixHoursMs },
        nextRunAt: new Date(now.getTime() + sixHoursMs),
      },
    ],
  });
};

const DELETION_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

export const softDeleteConnector = async (
  db: Database,
  id: string,
  deletedBy: string
): Promise<Connector> => {
  const now = new Date();
  return await db.connector.update({
    where: { id },
    data: {
      status: ConnectorStatus.DELETING,
      deletedAt: now,
      scheduledDeletionAt: new Date(now.getTime() + DELETION_GRACE_PERIOD_MS),
      deletedBy,
    },
  });
};

export const restoreConnector = async (
  db: Database,
  id: string
): Promise<Connector> =>
  await db.connector.update({
    where: { id },
    data: {
      status: ConnectorStatus.INACTIVE,
      deletedAt: null,
      scheduledDeletionAt: null,
      deletedBy: null,
    },
  });

export const hardDeleteConnector = async (
  db: Database,
  id: string
): Promise<Connector> => await db.connector.delete({ where: { id } });

export const findConnectorsPendingDeletion = async (
  db: Database
): Promise<Connector[]> =>
  await db.connector.findMany({
    where: {
      status: ConnectorStatus.DELETING,
      scheduledDeletionAt: { lte: new Date() },
    },
  });

export const activateConnector = async (
  db: Pick<Database, "connector">,
  id: string,
  data: ActivateConnectorInput
): Promise<Connector> =>
  db.connector.update({
    where: { id },
    data: {
      status: ConnectorStatus.ACTIVE,
      statusChangedAt: new Date(),
      lastSyncedAt: null,
      workspaceExternalId: data.workspaceExternalId,
      name: data.name,
      config: data.config as Prisma.InputJsonValue,
    },
  });

export const setConnectorError = async (
  db: Pick<Database, "connector">,
  id: string,
  error: string
): Promise<Connector> =>
  db.connector.update({
    where: { id },
    data: {
      status: ConnectorStatus.ERROR,
      statusChangedAt: new Date(),
      lastError: error,
      lastErrorAt: new Date(),
    },
  });

export const getConnectorById = async (
  db: Pick<Database, "connector">,
  id: string
): Promise<Connector> =>
  db.connector.findUniqueOrThrow({
    where: { id },
  });

export interface ConnectorWithOAuthResult {
  connector: Connector;
  oauthProvider: OAuthProvider;
}

export const createConnectorWithOAuth = async (
  db: Database,
  data: CreateConnectorWithOAuthInput
): Promise<ConnectorWithOAuthResult> =>
  db.$transaction(async (tx) => {
    const connector = await tx.connector.create({
      data: {
        teamId: data.teamId,
        userId: data.userId,
        app: data.app,
        workspaceExternalId: data.workspaceExternalId,
        name: data.name,
        type: data.type,
        authType: data.authType,
        config: (data.config ?? {}) as Prisma.InputJsonValue,
        status: ConnectorStatus.CONNECTING,
      },
    });

    const accessTokenEncrypted = encryptIfConfigured(data.accessToken);
    const refreshTokenEncrypted = encryptIfConfigured(data.refreshToken);
    const clientSecretEncrypted = encryptIfConfigured(data.clientSecret);

    const tokenExpiresAt =
      data.tokenExpiresAt ??
      (data.tokenExpiresIn
        ? new Date(Date.now() + data.tokenExpiresIn * 1000)
        : null);

    const oauthProvider = await tx.oAuthProvider.create({
      data: {
        connectorId: connector.id,
        app: data.app,
        accessToken: accessTokenEncrypted.encrypted,
        accessTokenIv: accessTokenEncrypted.iv,
        refreshToken: refreshTokenEncrypted.encrypted,
        refreshTokenIv: refreshTokenEncrypted.iv,
        tokenExpiresAt,
        tokenRefreshedAt: new Date(),
        oauthScopes: data.scopes ?? [],
        tokenScopes: data.scopes ?? [],
        tokenType: data.tokenType ?? "Bearer",
        clientId: data.clientId ?? null,
        clientSecret: clientSecretEncrypted.encrypted,
        clientSecretIv: clientSecretEncrypted.iv,
      },
    });

    return { connector, oauthProvider };
  });

export interface ActivateConnectorWithSyncResult {
  connector: Connector;
  syncJobs: SyncJob[];
}

export const activateConnectorWithSync = async (
  db: Database,
  id: string,
  data: ActivateConnectorInput
): Promise<ActivateConnectorWithSyncResult> =>
  db.$transaction(async (tx) => {
    const connector = await tx.connector.update({
      where: { id },
      data: {
        status: ConnectorStatus.ACTIVE,
        statusChangedAt: new Date(),
        lastSyncedAt: null,
        workspaceExternalId: data.workspaceExternalId,
        name: data.name,
        config: data.config as Prisma.InputJsonValue,
      },
    });

    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const sixHoursMs = 6 * 60 * 60 * 1000;

    const syncJobsData = [
      {
        connectorId: connector.id,
        type: SyncCategory.FULL,
        trigger: SyncTrigger.SCHEDULED,
        status: SyncJobStatus.PENDING,
        priority: 3,
        schedule: "0 0 * * 0",
        config: { intervalMs: sevenDaysMs },
        nextRunAt: new Date(now.getTime() + sevenDaysMs),
      },
      {
        connectorId: connector.id,
        type: SyncCategory.INCREMENTAL,
        trigger: SyncTrigger.SCHEDULED,
        status: SyncJobStatus.PENDING,
        priority: 5,
        schedule: "0 */6 * * *",
        config: { intervalMs: sixHoursMs },
        nextRunAt: new Date(now.getTime() + sixHoursMs),
      },
    ];

    await tx.syncJob.createMany({ data: syncJobsData });

    const syncJobs = await tx.syncJob.findMany({
      where: { connectorId: connector.id },
      orderBy: { priority: "asc" },
    });

    return { connector, syncJobs };
  });

export const deleteConnectorWithCleanup = async (
  db: Database,
  id: string
): Promise<{ connector: Connector; deletedSyncJobs: number }> =>
  db.$transaction(async (tx) => {
    await tx.oAuthProvider.deleteMany({ where: { connectorId: id } });

    const deletedSyncJobs = await tx.syncJob.deleteMany({
      where: { connectorId: id },
    });

    const connector = await tx.connector.delete({ where: { id } });

    return { connector, deletedSyncJobs: deletedSyncJobs.count };
  });
