import type { Connector, OAuthProvider } from "@openplane/db";
import type { SyncCursor } from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import {
  syncSlack,
  syncSlackStreaming,
  validateSlackConnection,
} from "./slack";

export interface SyncResult {
  documents: GenericDocument[];
  nextCursor?: string;
  hasMore: boolean;
  stats?: {
    processed: number;
    errors: number;
    duration: number;
  };
}

export interface StreamingSyncResult {
  totalDocuments: number;
  nextCursor?: string;
  hasMore: boolean;
  stats: {
    processed: number;
    errors: number;
    duration: number;
    batches: number;
  };
}

export interface SyncOptions {
  cursor?: string;
  batchSize?: number;
  forceFullSync?: boolean;
  onBatch?: (documents: GenericDocument[], cursor: string) => Promise<void>;
}

export interface ChannelInfo {
  id: string;
  name: string;
  is_private: boolean;
  is_member?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
}

export interface StreamingSyncOptions {
  cursor?: string;
  batchSize?: number;
  forceFullSync?: boolean;
  indexDms?: boolean;
  indexGroupDms?: boolean;
  onBatch: (batch: {
    items: GenericDocument[];
    cursor: string;
    hasMore: boolean;
    stats: { processed: number; errors: number };
  }) => Promise<void>;
  onResourcesDiscovered?: (resources: ChannelInfo[]) => Promise<void>;
  disabledResourceIds?: Set<string>;
  enabledResourceIds?: Set<string>;
  syncFiles?: boolean;
}

export async function syncConnectorStreaming(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: StreamingSyncOptions
): Promise<StreamingSyncResult> {
  const {
    cursor,
    batchSize,
    forceFullSync,
    indexDms,
    indexGroupDms,
    onBatch,
    onResourcesDiscovered,
    disabledResourceIds,
    enabledResourceIds,
    syncFiles,
  } = options;

  switch (connector.app) {
    case "SLACK": {
      const slackCursor: SyncCursor | undefined = cursor
        ? JSON.parse(cursor)
        : undefined;

      const result = await syncSlackStreaming(connector, {
        cursor: slackCursor,
        batchSize,
        forceFullSync,
        indexDms,
        indexGroupDms,
        onBatch: async (batch) => {
          await onBatch({
            items: batch.items,
            cursor: JSON.stringify(batch.cursor),
            hasMore: batch.hasMore,
            stats: batch.stats,
          });
        },
        onChannelsDiscovered: onResourcesDiscovered,
        disabledChannelIds: disabledResourceIds,
        enabledChannelIds: enabledResourceIds,
        syncFiles,
      });

      return {
        totalDocuments: result.totalDocuments,
        nextCursor: JSON.stringify(result.cursor),
        hasMore: result.hasMore,
        stats: result.stats,
      };
    }

    // Add more connectors here as we build them
    // case 'NOTION':
    //   return syncNotionStreaming(connector, options);
    // case 'GOOGLE_DRIVE':
    //   return syncGoogleDriveStreaming(connector, options);

    default:
      throw new Error(`Unsupported connector app: ${connector.app}`);
  }
}

export async function syncConnector(
  connector: Connector & { oauthProvider?: OAuthProvider | null },
  options: SyncOptions = {}
): Promise<SyncResult> {
  switch (connector.app) {
    case "SLACK": {
      const slackCursor = options.cursor
        ? JSON.parse(options.cursor)
        : undefined;

      const onBatchCallback = options.onBatch;
      const result = await syncSlack(connector, {
        cursor: slackCursor,
        batchSize: options.batchSize,
        forceFullSync: options.forceFullSync,
        onBatch: onBatchCallback
          ? async (batch) => {
              await onBatchCallback(batch.items, JSON.stringify(batch.cursor));
            }
          : undefined,
      });

      return {
        documents: result.documents,
        nextCursor: JSON.stringify(result.cursor),
        hasMore: result.hasMore,
        stats: result.stats,
      };
    }

    default:
      throw new Error(`Unsupported connector app: ${connector.app}`);
  }
}

export function validateConnection(
  connector: Connector & { oauthProvider?: OAuthProvider | null }
): Promise<boolean> {
  switch (connector.app) {
    case "SLACK":
      return validateSlackConnection(connector);

    default:
      throw new Error(`Unsupported connector app: ${connector.app}`);
  }
}
