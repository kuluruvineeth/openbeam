import {
  type Connector,
  decryptIfEncrypted,
  type OAuthProvider,
} from "@openplane/db";
import {
  createGoogleDriveClient,
  type GoogleDriveClient,
  type GoogleDriveDomainSyncCursor,
  type GoogleDriveSyncBatch,
  type GoogleDriveSyncCursor,
  type GoogleDriveTransformContext,
  GoogleDriveWatchManager,
  googleDriveIncrementalSync,
  isGoogleDriveDomainSyncCursor,
  isGoogleDriveSyncCursor,
  listAllSharedDrives,
  syncDomainDrives,
} from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import logger from "../../utils/logger";
import type { FileDiscoveryHandler } from "../factory";

export interface GoogleDriveSyncResult {
  totalDocuments: number;
  cursor: GoogleDriveSyncCursor | GoogleDriveDomainSyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    errors: number;
    duration: number;
    batches: number;
  };
  filesQueued: number;
  mediaQueued: number;
}

export interface DriveResourceInfo {
  id: string;
  name: string;
  resourceType: "shared_drive" | "my_drive";
  isPrivate: boolean;
  metadata?: Record<string, unknown>;
}

export interface GoogleDriveSyncOptions {
  cursor?: GoogleDriveSyncCursor | GoogleDriveDomainSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  includeSharedDrives?: boolean;
  lookbackDays?: number;
  indexMedia?: boolean;
  extractContent?: boolean;
  onBatch: (batch: GoogleDriveSyncBatch<GenericDocument>) => Promise<void>;
  onDrivesDiscovered?: (drives: DriveResourceInfo[]) => Promise<void>;
  onFilesDiscovered?: FileDiscoveryHandler;
  onDocumentsRemoved?: (documentIds: string[]) => Promise<void>;
}

function getConnectorConfig(
  connector: Connector
): Record<string, unknown> | null {
  if (!connector.config || typeof connector.config !== "object") {
    return null;
  }
  return connector.config as Record<string, unknown>;
}

function extractCredentials(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { accessToken: string; isServiceAccount: boolean; userEmail?: string } {
  if (!connector.oauthProvider) {
    throw new Error("Google Drive connector requires OAuth provider");
  }

  const oauth = connector.oauthProvider;
  const accessToken = decryptIfEncrypted(
    oauth.accessToken,
    oauth.accessTokenIv
  );

  if (!accessToken) {
    throw new Error("Failed to decrypt Google Drive access token");
  }

  const config = getConnectorConfig(connector);
  const isServiceAccount = config?.auth_method === "service_account";

  let userEmail: string | undefined;
  if (typeof config?.userEmail === "string") {
    userEmail = config.userEmail;
  } else if (typeof config?.delegatedEmail === "string") {
    userEmail = config.delegatedEmail;
  }

  return { accessToken, isServiceAccount, userEmail };
}

function buildContext(
  connector: Connector
): Omit<GoogleDriveTransformContext, "userEmail"> {
  return {
    connectorId: connector.id,
    connectorType: connector.app.toLowerCase(),
    teamId: connector.teamId,
    workspaceId: connector.workspaceExternalId ?? connector.id,
  };
}

interface SyncState {
  totalDocuments: number;
  totalProcessed: number;
  totalErrors: number;
  batchCount: number;
  latestCursor: GoogleDriveSyncCursor | GoogleDriveDomainSyncCursor;
  filesQueued: number;
  mediaQueued: number;
}

interface BatchProcessContext {
  state: SyncState;
  connectorId: string;
  onBatch: (batch: GoogleDriveSyncBatch<GenericDocument>) => Promise<void>;
  logMessage: string;
}

async function processBatch(
  batch: GoogleDriveSyncBatch<GenericDocument>,
  ctx: BatchProcessContext
): Promise<void> {
  ctx.state.totalDocuments += batch.items.length;
  ctx.state.totalProcessed += batch.stats.processed;
  ctx.state.totalErrors += batch.stats.errors;
  ctx.state.batchCount += 1;
  ctx.state.latestCursor = batch.cursor;

  if (batch.items.length > 0) {
    await ctx.onBatch(batch);
  }

  logger.debug(
    {
      connectorId: ctx.connectorId,
      batchNumber: ctx.state.batchCount,
      batchSize: batch.items.length,
      totalSoFar: ctx.state.totalDocuments,
    },
    ctx.logMessage
  );
}

export async function syncGoogleDriveStreaming(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: GoogleDriveSyncOptions
): Promise<GoogleDriveSyncResult> {
  const startTime = Date.now();
  const { accessToken, isServiceAccount, userEmail } =
    extractCredentials(connector);
  const baseContext = buildContext(connector);

  logger.info(
    {
      connectorId: connector.id,
      isServiceAccount,
      hasCursor: !!options.cursor,
      forceFullSync: options.forceFullSync,
    },
    "Starting Google Drive streaming sync"
  );

  const initialCursor = isGoogleDriveSyncCursor(options.cursor)
    ? options.cursor
    : {};
  const state: SyncState = {
    totalDocuments: 0,
    totalProcessed: 0,
    totalErrors: 0,
    batchCount: 0,
    latestCursor: initialCursor,
    filesQueued: 0,
    mediaQueued: 0,
  };

  if (isServiceAccount) {
    await runDomainSync({
      connector,
      baseContext,
      options,
      state,
    });
  } else {
    await runOAuthSync({
      connector,
      accessToken,
      userEmail,
      baseContext,
      options,
      state,
    });
  }

  const duration = Date.now() - startTime;
  logger.info(
    {
      connectorId: connector.id,
      totalDocuments: state.totalDocuments,
      duration,
    },
    "Google Drive streaming sync completed"
  );

  return {
    totalDocuments: state.totalDocuments,
    cursor: state.latestCursor,
    hasMore: false,
    stats: {
      processed: state.totalProcessed,
      errors: state.totalErrors,
      duration,
      batches: state.batchCount,
    },
    filesQueued: state.filesQueued,
    mediaQueued: state.mediaQueued,
  };
}

interface DomainSyncParams {
  connector: Connector;
  baseContext: Omit<GoogleDriveTransformContext, "userEmail">;
  options: GoogleDriveSyncOptions;
  state: SyncState;
}

async function runDomainSync(params: DomainSyncParams): Promise<void> {
  const { connector, baseContext, options, state } = params;
  const domainCursor = isGoogleDriveDomainSyncCursor(options.cursor)
    ? options.cursor
    : undefined;
  const batchCtx: BatchProcessContext = {
    state,
    connectorId: connector.id,
    onBatch: options.onBatch,
    logMessage: "Streamed domain sync batch",
  };

  for await (const batch of syncDomainDrives(connector.id, baseContext, {
    cursor: domainCursor,
    batchSize: options.batchSize ?? 100,
    indexMedia: options.indexMedia ?? true,
    extractContent: options.extractContent ?? true,
    onDocumentsRemoved: options.onDocumentsRemoved,
  })) {
    await processBatch(batch, batchCtx);
  }
}

interface OAuthSyncParams {
  connector: Connector;
  accessToken: string;
  userEmail: string | undefined;
  baseContext: Omit<GoogleDriveTransformContext, "userEmail">;
  options: GoogleDriveSyncOptions;
  state: SyncState;
}

async function runOAuthSync(params: OAuthSyncParams): Promise<void> {
  const { connector, accessToken, userEmail, baseContext, options, state } =
    params;

  const client = createGoogleDriveClient({
    accessToken,
    connectorId: connector.id,
    userEmail,
  });

  const isHealthy = await client.healthCheck();
  if (!isHealthy) {
    throw new Error("Google Drive connection validation failed");
  }

  // Discover shared drives if enabled
  if (options.onDrivesDiscovered && options.includeSharedDrives !== false) {
    await discoverDrives(client, connector.id, options.onDrivesDiscovered);
  }

  const context: GoogleDriveTransformContext = {
    ...baseContext,
    userEmail: userEmail ?? "",
  };

  const driveCursor = isGoogleDriveSyncCursor(options.cursor)
    ? options.cursor
    : undefined;
  const batchCtx: BatchProcessContext = {
    state,
    connectorId: connector.id,
    onBatch: options.onBatch,
    logMessage: "Streamed sync batch",
  };

  // Wrap the FileDiscoveryHandler to capture results and update state
  const { onFilesDiscovered } = options;
  const handleFilesDiscovered = onFilesDiscovered
    ? async (files: import("@openplane/services").ConnectorFileInfo[]) => {
        const result = await onFilesDiscovered(files, {
          connectorId: connector.id,
          skipExisting: true,
          priority: 5,
        });
        state.filesQueued += result.queued;
        state.mediaQueued += result.mediaQueued;
      }
    : undefined;

  for await (const batch of googleDriveIncrementalSync(client, context, {
    cursor: driveCursor,
    forceFullSync: options.forceFullSync ?? false,
    batchSize: options.batchSize ?? 100,
    includeSharedDrives: options.includeSharedDrives ?? true,
    lookbackDays: options.lookbackDays,
    indexMedia: options.indexMedia ?? true,
    extractContent: options.extractContent ?? true,
    onDocumentsRemoved: options.onDocumentsRemoved,
    onFilesDiscovered: handleFilesDiscovered,
  })) {
    await processBatch(batch, batchCtx);
  }

  // Set up watch for push notifications
  await setupDriveWatch(client, connector);
}

async function discoverDrives(
  client: GoogleDriveClient,
  connectorId: string,
  onDrivesDiscovered: (drives: DriveResourceInfo[]) => Promise<void>
): Promise<void> {
  try {
    const sharedDrives = await listAllSharedDrives(client);

    const resources: DriveResourceInfo[] = [
      // Add My Drive as a resource
      {
        id: "my-drive",
        name: "My Drive",
        resourceType: "my_drive",
        isPrivate: true,
      },
      // Add all shared drives
      ...sharedDrives.map((drive) => ({
        id: drive.id,
        name: drive.name,
        resourceType: "shared_drive" as const,
        isPrivate: false,
        metadata: {
          colorRgb: drive.colorRgb,
          createdTime: drive.createdTime,
        },
      })),
    ];

    await onDrivesDiscovered(resources);

    logger.info(
      { connectorId, sharedDriveCount: sharedDrives.length },
      "Discovered Google Drive resources"
    );
  } catch (error) {
    logger.warn(
      { connectorId, error },
      "Failed to discover shared drives (may not have access)"
    );
  }
}

async function setupDriveWatch(
  client: GoogleDriveClient,
  connector: Connector
): Promise<void> {
  const config = getConnectorConfig(connector);
  const enablePush = config?.enable_push_notifications !== false;

  if (!enablePush) {
    logger.info(
      { connectorId: connector.id },
      "Push notifications disabled in connector config, skipping Drive watch"
    );
    return;
  }

  // Auto-generate webhook URL from SERVER_URL env var
  const serverUrl = process.env.SERVER_URL;
  if (!serverUrl) {
    logger.info(
      { connectorId: connector.id },
      "SERVER_URL env var not set, skipping Drive watch setup (set SERVER_URL to enable real-time sync)"
    );
    return;
  }

  const webhookUrl = `${serverUrl}/api/v1/webhooks/google-drive/push`;

  try {
    const watchManager = new GoogleDriveWatchManager(client, { webhookUrl });
    const watchState = await watchManager.setup();
    if (watchState) {
      logger.info(
        {
          connectorId: connector.id,
          channelId: watchState.channelId,
          expiration: new Date(watchState.expiration).toISOString(),
        },
        "Google Drive watch set up successfully"
      );
    }
  } catch (error) {
    logger.warn(
      { connectorId: connector.id, error },
      "Failed to set up Google Drive watch - push notifications disabled"
    );
  }
}

export async function validateGoogleDriveConnection(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): Promise<boolean> {
  try {
    const { accessToken, userEmail } = extractCredentials(connector);

    const client = createGoogleDriveClient({
      accessToken,
      connectorId: connector.id,
      userEmail,
    });

    return await client.healthCheck();
  } catch (error) {
    logger.error(
      { connectorId: connector.id, error },
      "Google Drive connection validation failed"
    );
    return false;
  }
}

export function createGoogleDriveClientFromConnector(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { client: GoogleDriveClient; context: GoogleDriveTransformContext } {
  const { accessToken, userEmail } = extractCredentials(connector);
  const baseContext = buildContext(connector);

  const client = createGoogleDriveClient({
    accessToken,
    connectorId: connector.id,
    userEmail,
  });

  const context: GoogleDriveTransformContext = {
    ...baseContext,
    userEmail: userEmail ?? "",
  };

  return { client, context };
}
