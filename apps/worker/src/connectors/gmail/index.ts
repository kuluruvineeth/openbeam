import {
  type Connector,
  decryptIfEncrypted,
  type OAuthProvider,
} from "@openplane/db";
import {
  createGmailClient,
  type DomainSyncCursor,
  type GmailAttachmentInfo,
  type GmailClient,
  type GmailLabel,
  type GmailMediaInfo,
  type GmailSyncBatch,
  type GmailSyncCursor,
  type GmailTransformContext,
  GmailWatchManager,
  gmailIncrementalSync,
  syncDomainMailboxes,
  transformGmailAttachments,
  transformGmailMediaList,
} from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import logger from "../../utils/logger";
import type { FileDiscoveryHandler } from "../factory";

export interface GmailSyncResult {
  totalDocuments: number;
  cursor: GmailSyncCursor | DomainSyncCursor;
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

export interface GmailSyncOptions {
  cursor?: GmailSyncCursor | DomainSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  includeLabels?: string[];
  excludeLabels?: string[];
  lookbackDays?: number;
  indexAttachments?: boolean;
  indexMedia?: boolean;
  onBatch: (batch: GmailSyncBatch<GenericDocument>) => Promise<void>;
  onLabelsDiscovered?: (labels: GmailLabel[]) => Promise<void>;
  onFilesDiscovered?: FileDiscoveryHandler;
}

function extractCredentials(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { accessToken: string; isServiceAccount: boolean; userEmail?: string } {
  if (!connector.oauthProvider) {
    throw new Error("Gmail connector requires OAuth provider");
  }

  const oauth = connector.oauthProvider;
  const accessToken = decryptIfEncrypted(
    oauth.accessToken,
    oauth.accessTokenIv
  );

  if (!accessToken) {
    throw new Error("Failed to decrypt Gmail access token");
  }

  const config = connector.config as Record<string, unknown> | null;
  const isServiceAccount = config?.auth_method === "service_account";
  const userEmail = (config?.userEmail ?? config?.delegatedEmail) as
    | string
    | undefined;

  return { accessToken, isServiceAccount, userEmail };
}

function buildContext(
  connector: Connector
): Omit<GmailTransformContext, "userEmail"> {
  return {
    connectorId: connector.id,
    connectorType: "gmail",
    teamId: connector.teamId,
    workspaceId: connector.workspaceExternalId ?? connector.id,
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sync orchestration requires branching for service account vs OAuth flows
export async function syncGmailStreaming(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: GmailSyncOptions
): Promise<GmailSyncResult> {
  const startTime = Date.now();
  const {
    cursor,
    batchSize = 100,
    forceFullSync = false,
    includeLabels,
    excludeLabels = ["SPAM", "TRASH"],
    lookbackDays,
    indexAttachments = true,
    indexMedia = true,
    onBatch,
    onLabelsDiscovered,
    onFilesDiscovered,
  } = options;

  const { accessToken, isServiceAccount, userEmail } =
    extractCredentials(connector);
  const baseContext = buildContext(connector);

  logger.info(
    {
      connectorId: connector.id,
      isServiceAccount,
      userEmail,
      hasCursor: !!cursor,
      forceFullSync,
      indexAttachments,
      indexMedia,
    },
    "Starting Gmail streaming sync"
  );

  let totalDocuments = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  let batchCount = 0;
  let latestCursor: GmailSyncCursor | DomainSyncCursor =
    (cursor as GmailSyncCursor) ?? {};
  let filesQueued = 0;
  let mediaQueued = 0;

  const handleAttachmentsDiscovered = async (
    attachments: GmailAttachmentInfo[]
  ): Promise<void> => {
    if (attachments.length === 0 || !onFilesDiscovered) {
      return;
    }

    const genericFiles = transformGmailAttachments(attachments);
    const result = await onFilesDiscovered(genericFiles, {
      connectorId: connector.id,
      skipExisting: true,
      priority: 5,
    });

    filesQueued += result.queued;

    logger.debug(
      {
        connectorId: connector.id,
        attachmentCount: attachments.length,
        queued: result.queued,
        skipped: result.skipped,
      },
      "Processed Gmail attachments"
    );
  };

  const handleMediaDiscovered = async (
    media: GmailMediaInfo[]
  ): Promise<void> => {
    if (media.length === 0 || !onFilesDiscovered) {
      return;
    }

    const genericMedia = transformGmailMediaList(media);
    const result = await onFilesDiscovered(genericMedia, {
      connectorId: connector.id,
      skipExisting: true,
      priority: 5,
    });

    mediaQueued += result.mediaQueued;

    logger.debug(
      {
        connectorId: connector.id,
        mediaCount: media.length,
        queued: result.mediaQueued,
        skipped: result.skipped,
      },
      "Processed Gmail media"
    );
  };

  try {
    if (isServiceAccount) {
      const domainCursor = cursor as DomainSyncCursor | undefined;

      for await (const batch of syncDomainMailboxes(connector.id, baseContext, {
        cursor: domainCursor,
        batchSize,
        includeLabels,
        excludeLabels,
        indexAttachments,
        indexMedia,
        onAttachmentsDiscovered: indexAttachments
          ? handleAttachmentsDiscovered
          : undefined,
        onMediaDiscovered: indexMedia ? handleMediaDiscovered : undefined,
      })) {
        totalDocuments += batch.items.length;
        totalProcessed += batch.stats.processed;
        totalErrors += batch.stats.errors;
        batchCount += 1;
        latestCursor = batch.cursor;

        if (batch.items.length > 0) {
          await onBatch(batch);
        }

        logger.debug(
          {
            connectorId: connector.id,
            batchNumber: batchCount,
            batchSize: batch.items.length,
            totalSoFar: totalDocuments,
          },
          "Streamed Gmail domain sync batch"
        );
      }
    } else {
      const client = createGmailClient({
        accessToken,
        connectorId: connector.id,
        userEmail,
      });

      const isHealthy = await client.healthCheck();
      if (!isHealthy) {
        throw new Error("Gmail connection validation failed");
      }

      const context: GmailTransformContext = {
        ...baseContext,
        userEmail: userEmail ?? "",
      };

      const gmailCursor = cursor as GmailSyncCursor | undefined;

      for await (const batch of gmailIncrementalSync(client, context, {
        cursor: gmailCursor,
        forceFullSync,
        batchSize,
        includeLabels,
        excludeLabels,
        lookbackDays,
        indexAttachments,
        indexMedia,
        onLabelsDiscovered,
        onAttachmentsDiscovered: indexAttachments
          ? handleAttachmentsDiscovered
          : undefined,
        onMediaDiscovered: indexMedia ? handleMediaDiscovered : undefined,
      })) {
        totalDocuments += batch.items.length;
        totalProcessed += batch.stats.processed;
        totalErrors += batch.stats.errors;
        batchCount += 1;
        latestCursor = batch.cursor;

        if (batch.items.length > 0) {
          await onBatch(batch);
        }

        logger.debug(
          {
            connectorId: connector.id,
            batchNumber: batchCount,
            batchSize: batch.items.length,
            totalSoFar: totalDocuments,
          },
          "Streamed Gmail sync batch"
        );
      }

      // Set up Gmail Watch for push notifications if enabled
      const config = connector.config as Record<string, unknown> | null;
      const enablePush = config?.enable_push_notifications !== false;
      const pubsubTopic = config?.pubsub_topic as string | undefined;

      if (enablePush && pubsubTopic) {
        try {
          const watchManager = new GmailWatchManager(client, {
            topicName: pubsubTopic,
          });
          const watchState = await watchManager.setup();
          if (watchState) {
            logger.info(
              {
                connectorId: connector.id,
                historyId: watchState.historyId,
                expiration: new Date(watchState.expiration).toISOString(),
              },
              "Gmail watch set up successfully"
            );
          }
        } catch (watchError) {
          logger.warn(
            { connectorId: connector.id, error: watchError },
            "Failed to set up Gmail watch - push notifications disabled"
          );
        }
      }
    }

    const duration = Date.now() - startTime;

    logger.info(
      {
        connectorId: connector.id,
        totalDocuments,
        filesQueued,
        mediaQueued,
        batches: batchCount,
        duration,
        errors: totalErrors,
      },
      "Gmail streaming sync completed"
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
      filesQueued,
      mediaQueued,
    };
  } catch (error) {
    logger.error(
      {
        error,
        connectorId: connector.id,
        documentsBeforeError: totalDocuments,
      },
      "Gmail streaming sync failed"
    );
    throw error;
  }
}

export async function validateGmailConnection(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): Promise<boolean> {
  try {
    const { accessToken, userEmail } = extractCredentials(connector);

    const client = createGmailClient({
      accessToken,
      connectorId: connector.id,
      userEmail,
    });

    return await client.healthCheck();
  } catch (error) {
    logger.error(
      { connectorId: connector.id, error },
      "Gmail connection validation failed"
    );
    return false;
  }
}

export function createGmailClientFromConnector(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): { client: GmailClient; context: GmailTransformContext } {
  const { accessToken, userEmail } = extractCredentials(connector);
  const baseContext = buildContext(connector);

  const client = createGmailClient({
    accessToken,
    connectorId: connector.id,
    userEmail,
  });

  const context: GmailTransformContext = {
    ...baseContext,
    userEmail: userEmail ?? "",
  };

  return { client, context };
}
