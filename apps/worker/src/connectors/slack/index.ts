import {
  type Connector,
  decryptIfEncrypted,
  type OAuthProvider,
} from "@openplane/db";
import {
  createSlackClient,
  incrementalSync,
  type SlackChannel,
  type SlackClient,
  type SyncBatch,
  type SyncCursor,
  type TransformContext,
} from "@openplane/services";

import type { GenericDocument } from "@openplane/vespa";
import logger from "../../utils/logger";

export interface SlackSyncResult {
  totalDocuments: number;
  cursor: SyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    errors: number;
    duration: number;
    batches: number;
  };
}

export interface SlackChannelInfo {
  id: string;
  name: string;
  is_private: boolean;
}

export interface SlackSyncOptions {
  cursor?: SyncCursor;
  batchSize?: number;
  indexPrivate?: boolean;
  includeThreads?: boolean;
  forceFullSync?: boolean;
  onBatch: (batch: SyncBatch<GenericDocument>) => Promise<void>;
  onChannelsDiscovered?: (channels: SlackChannelInfo[]) => Promise<void>;
  disabledChannelIds?: Set<string>;
  enabledChannelIds?: Set<string>;
}

function extractCredentials(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { token: string; teamId?: string; tokenType: "sync" | "bot" } {
  if (!connector.oauthProvider) {
    throw new Error("Slack connector requires OAuth provider");
  }

  const oauth = connector.oauthProvider;

  const syncToken = decryptIfEncrypted(
    oauth.syncAccessToken,
    oauth.syncAccessTokenIv
  );
  const botToken = decryptIfEncrypted(oauth.accessToken, oauth.accessTokenIv);

  const token = syncToken ?? botToken;
  const tokenType = syncToken ? "sync" : "bot";

  if (!token) {
    throw new Error("Failed to decrypt Slack access token");
  }

  const config = connector.config as Record<string, unknown> | null;
  const teamId = config?.teamId as string | undefined;

  logger.debug(
    {
      connectorId: connector.id,
      tokenType,
      hasSyncToken: !!syncToken,
      hasBotToken: !!botToken,
    },
    "Extracted Slack credentials"
  );

  return { token, teamId, tokenType };
}

function buildContext(connector: Connector): TransformContext {
  return {
    connectorId: connector.id,
    connectorType: connector.app,
    teamId: connector.teamId,
    workspaceId: connector.workspaceExternalId ?? connector.id,
  };
}

export async function syncSlackStreaming(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: SlackSyncOptions
): Promise<SlackSyncResult> {
  const startTime = Date.now();
  const {
    cursor,
    batchSize = 100,
    indexPrivate = false,
    includeThreads = true,
    forceFullSync = false,
    onBatch,
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
  } = options;

  const disabledArray = disabledChannelIds
    ? Array.from(disabledChannelIds)
    : [];

  logger.info(
    {
      connectorId: connector.id,
      hasCursor: !!cursor,
      forceFullSync,
      disabledChannelIdsCount: disabledChannelIds?.size ?? 0,
      disabledChannelIds: disabledArray,
      enabledChannelIdsCount: enabledChannelIds?.size ?? 0,
    },
    "Starting Slack streaming sync with channel filters"
  );

  const { token, teamId } = extractCredentials(connector);
  const context = buildContext(connector);

  const client = createSlackClient({
    token,
    connectorId: connector.id,
    teamId,
  });

  const isHealthy = await client.healthCheck();
  if (!isHealthy) {
    throw new Error("Slack connection validation failed");
  }

  let totalDocuments = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  let batchCount = 0;
  let latestCursor: SyncCursor = cursor ?? {};

  try {
    for await (const batch of incrementalSync(client, context, {
      cursor,
      forceFullSync,
      channelOptions: {
        indexPrivate,
        batchSize,
      },
      messageOptions: {
        includeThreads,
        batchSize,
      },
      onChannelsDiscovered: onChannelsDiscovered
        ? async (channels: SlackChannel[]) => {
            await onChannelsDiscovered(
              channels.map((ch: SlackChannel) => ({
                id: ch.id,
                name: ch.name,
                is_private: ch.is_private,
                is_member: ch.is_member,
              }))
            );
          }
        : undefined,
      disabledChannelIds,
      enabledChannelIds,
    })) {
      totalDocuments += batch.items.length;
      totalProcessed += batch.stats.processed;
      totalErrors += batch.stats.errors;
      batchCount += 1;
      latestCursor = batch.cursor;

      await onBatch(batch);

      logger.debug(
        {
          connectorId: connector.id,
          batchNumber: batchCount,
          batchSize: batch.items.length,
          totalSoFar: totalDocuments,
          hasMore: batch.hasMore,
        },
        "Streamed sync batch"
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
        throughput: duration > 0 ? (totalDocuments / duration) * 1000 : 0,
      },
      "Slack streaming sync completed"
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
    };
  } catch (error) {
    logger.error(
      {
        error,
        connectorId: connector.id,
        documentsBeforeError: totalDocuments,
        batchesBeforeError: batchCount,
      },
      "Slack streaming sync failed"
    );
    throw error;
  }
}

export async function syncSlack(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: Omit<SlackSyncOptions, "onBatch"> & {
    onBatch?: (batch: SyncBatch<GenericDocument>) => Promise<void>;
  } = {}
): Promise<{
  documents: GenericDocument[];
  cursor: SyncCursor;
  hasMore: boolean;
  stats: { processed: number; errors: number; duration: number };
}> {
  const allDocuments: GenericDocument[] = [];

  const result = await syncSlackStreaming(connector, {
    ...options,
    onBatch: async (batch) => {
      allDocuments.push(...batch.items);
      if (options.onBatch) {
        await options.onBatch(batch);
      }
    },
  });

  return {
    documents: allDocuments,
    cursor: result.cursor,
    hasMore: result.hasMore,
    stats: {
      processed: result.stats.processed,
      errors: result.stats.errors,
      duration: result.stats.duration,
    },
  };
}

export async function validateSlackConnection(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): Promise<boolean> {
  try {
    const { token, teamId } = extractCredentials(connector);

    const client = createSlackClient({
      token,
      connectorId: connector.id,
      teamId,
    });

    return await client.healthCheck();
  } catch (error) {
    logger.error(
      { error, connectorId: connector.id },
      "Slack connection validation failed"
    );
    return false;
  }
}

export function createSlackClientFromConnector(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { client: SlackClient; context: TransformContext } {
  const { token, teamId } = extractCredentials(connector);
  const context = buildContext(connector);

  const client = createSlackClient({
    token,
    connectorId: connector.id,
    teamId,
  });

  return { client, context };
}
