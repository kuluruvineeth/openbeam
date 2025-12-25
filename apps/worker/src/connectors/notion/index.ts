import {
  type Connector,
  decryptIfEncrypted,
  type OAuthProvider,
} from "@openplane/db";
import {
  createNotionClient,
  type NotionClient,
  type NotionDatabase,
  type NotionPage,
  type NotionSyncCursor,
  type NotionTransformContext,
  notionFullSync,
} from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import logger from "../../utils/logger";

export interface NotionSyncResult {
  totalDocuments: number;
  cursor: NotionSyncCursor;
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

export interface NotionSyncOptions {
  cursor?: NotionSyncCursor;
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
  onDatabasesDiscovered?: (databases: NotionDatabase[]) => Promise<void>;
  onPagesDiscovered?: (pages: NotionPage[]) => Promise<void>;
}

function extractCredentials(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { token: string } {
  if (!connector.oauthProvider) {
    throw new Error("Notion connector requires OAuth provider");
  }

  const token = decryptIfEncrypted(
    connector.oauthProvider.accessToken,
    connector.oauthProvider.accessTokenIv
  );

  if (!token) {
    throw new Error("Failed to decrypt Notion access token");
  }

  return { token };
}

function buildContext(connector: Connector): NotionTransformContext {
  return {
    connectorId: connector.id,
    connectorType: "notion",
    teamId: connector.teamId,
    workspaceId: connector.workspaceExternalId ?? connector.id,
  };
}

export async function syncNotionStreaming(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: NotionSyncOptions
): Promise<NotionSyncResult> {
  const startTime = Date.now();
  const {
    cursor,
    batchSize = 50,
    forceFullSync = false,
    onBatch,
    onStageChange,
    onDatabasesDiscovered,
    onPagesDiscovered,
  } = options;

  const config = connector.config as Record<string, unknown> | null;
  const extractContent = config?.extract_content !== false;
  const extractComments = config?.extract_comments !== false;
  const maxBlockDepth = config?.max_block_depth
    ? Number(config.max_block_depth)
    : 10;
  const lookbackDays = config?.lookback_days
    ? Number(config.lookback_days)
    : undefined;

  logger.info(
    {
      connectorId: connector.id,
      hasCursor: !!cursor,
      forceFullSync,
      extractContent,
      extractComments,
      maxBlockDepth,
      lookbackDays,
    },
    "Starting Notion streaming sync"
  );

  const { token } = extractCredentials(connector);
  const context = buildContext(connector);

  const client = createNotionClient({
    accessToken: token,
    connectorId: connector.id,
  });

  let totalDocuments = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  let batchCount = 0;
  let latestCursor: NotionSyncCursor = cursor ?? { lastSyncTime: Date.now() };

  try {
    for await (const batch of notionFullSync(client, context, {
      batchSize,
      extractContent,
      extractComments,
      maxBlockDepth,
      lookbackDays,
      onStageChange,
      onDatabasesDiscovered,
      onPagesDiscovered,
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
        "Streamed Notion sync batch"
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
      "Notion streaming sync completed"
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
      "Notion streaming sync failed"
    );
    throw error;
  }
}

export async function validateNotionConnection(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): Promise<boolean> {
  try {
    const { token } = extractCredentials(connector);

    logger.info(
      { connectorId: connector.id },
      "Starting Notion connection health check"
    );

    const client = createNotionClient({
      accessToken: token,
      connectorId: connector.id,
    });

    const isHealthy = await client.healthCheck();

    if (!isHealthy) {
      logger.error(
        { connectorId: connector.id },
        "Notion connection health check failed"
      );
    }

    return isHealthy;
  } catch (error) {
    logger.error(
      {
        connectorId: connector.id,
        error,
      },
      "Notion connection validation failed"
    );
    return false;
  }
}

export function createNotionClientFromConnector(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { client: NotionClient; context: NotionTransformContext } {
  const { token } = extractCredentials(connector);
  const context = buildContext(connector);
  const client = createNotionClient({
    accessToken: token,
    connectorId: connector.id,
  });
  return { client, context };
}
