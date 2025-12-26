import {
  type Connector,
  decryptIfEncrypted,
  type OAuthProvider,
} from "@openplane/db";
import {
  createLinearClient,
  type LinearClient,
  type LinearSyncCursor,
  type LinearTransformContext,
  linearFullSync,
} from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import logger from "../../utils/logger";

export interface LinearSyncResult {
  totalDocuments: number;
  cursor: LinearSyncCursor;
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

export interface LinearSyncOptions {
  cursor?: LinearSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  onBatch: (batch: {
    items: GenericDocument[];
    cursor: string;
    hasMore: boolean;
    stats: { processed: number; errors: number };
  }) => Promise<void>;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
  onTeamsDiscovered?: (
    teams: Array<{ id: string; name: string }>
  ) => Promise<void>;
}

function validateCredentials(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): void {
  if (!connector.oauthProvider) {
    throw new Error("Linear connector requires OAuth provider");
  }

  const token = decryptIfEncrypted(
    connector.oauthProvider.accessToken,
    connector.oauthProvider.accessTokenIv
  );

  if (!token) {
    throw new Error("Failed to decrypt Linear access token");
  }
}

function buildContext(connector: Connector): LinearTransformContext {
  const config = connector.config as Record<string, unknown> | null;
  return {
    connectorId: connector.id,
    connectorType: "LINEAR",
    teamId: connector.teamId,
    workspaceId: connector.workspaceExternalId ?? connector.id,
    organizationName: config?.organizationName as string | undefined,
    urlKey: config?.urlKey as string | undefined,
  };
}

export async function syncLinearStreaming(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: LinearSyncOptions
): Promise<LinearSyncResult> {
  const startTime = Date.now();
  const {
    cursor,
    batchSize = 50,
    forceFullSync = false,
    onBatch,
    onStageChange,
    onTeamsDiscovered,
  } = options;

  const config = connector.config as Record<string, unknown> | null;
  const syncComments = config?.sync_comments !== false;
  const syncDocuments = config?.sync_documents !== false;
  const lookbackDays = config?.lookback_days
    ? Number(config.lookback_days)
    : undefined;

  logger.info(
    {
      connectorId: connector.id,
      hasCursor: !!cursor,
      forceFullSync,
      syncComments,
      syncDocuments,
      lookbackDays,
    },
    "Starting Linear streaming sync"
  );

  validateCredentials(connector);
  const context = buildContext(connector);

  const client = createLinearClient({ connectorId: connector.id });

  let totalDocuments = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  let batchCount = 0;
  let latestCursor: LinearSyncCursor = cursor ?? { lastSyncTime: Date.now() };

  try {
    for await (const batch of linearFullSync(client, context, {
      batchSize,
      syncComments,
      syncDocuments,
      lookbackDays,
      onStageChange,
      onTeamsDiscovered,
    })) {
      totalDocuments += batch.items.length;
      totalProcessed += batch.stats.processed;
      totalErrors += batch.stats.errors;
      batchCount += 1;
      latestCursor = batch.cursor;

      if (batch.items.length > 0) {
        await onBatch({
          items: batch.items,
          cursor: JSON.stringify(batch.cursor),
          hasMore: batch.hasMore,
          stats: {
            processed: batch.stats.processed,
            errors: batch.stats.errors,
          },
        });
      }

      logger.debug(
        {
          connectorId: connector.id,
          batchNumber: batchCount,
          batchSize: batch.items.length,
          totalSoFar: totalDocuments,
          hasMore: batch.hasMore,
        },
        "Streamed Linear sync batch"
      );
    }

    const duration = Date.now() - startTime;

    logger.info(
      {
        connectorId: connector.id,
        totalDocuments,
        batches: batchCount,
        duration,
        errors: totalErrors,
      },
      "Linear streaming sync completed"
    );

    return {
      totalDocuments,
      cursor: latestCursor,
      hasMore: false,
      stats: {
        processed: totalProcessed,
        errors: totalErrors,
        duration,
        batches: batchCount,
      },
      filesQueued: 0,
      mediaQueued: 0,
    };
  } catch (error) {
    logger.error(
      {
        error,
        connectorId: connector.id,
        documentsBeforeError: totalDocuments,
        batchesBeforeError: batchCount,
      },
      "Linear streaming sync failed"
    );
    throw error;
  }
}

export async function validateLinearConnection(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): Promise<boolean> {
  try {
    validateCredentials(connector);

    logger.info(
      { connectorId: connector.id },
      "Starting Linear connection health check"
    );

    const client = createLinearClient({ connectorId: connector.id });
    const isHealthy = await client.healthCheck();

    if (!isHealthy) {
      logger.error(
        { connectorId: connector.id },
        "Linear connection health check failed"
      );
    }

    return isHealthy;
  } catch (error) {
    logger.error(
      {
        connectorId: connector.id,
        error,
      },
      "Linear connection validation failed"
    );
    return false;
  }
}

export function createLinearClientFromConnector(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { client: LinearClient; context: LinearTransformContext } {
  validateCredentials(connector);
  const context = buildContext(connector);
  const client = createLinearClient({ connectorId: connector.id });
  return { client, context };
}
