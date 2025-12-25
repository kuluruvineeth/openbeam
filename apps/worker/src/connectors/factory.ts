import type { Connector, OAuthProvider } from "@openplane/db";
import type {
  ConnectorFileInfo,
  GmailSyncCursor,
  GoogleDriveSyncCursor,
  NotionDatabase,
  NotionPage,
  NotionSyncCursor,
  SyncCursor,
} from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import { syncGmailStreaming, validateGmailConnection } from "./gmail";
import {
  syncGoogleDriveStreaming,
  validateGoogleDriveConnection,
} from "./google-drive";
import { syncNotionStreaming, validateNotionConnection } from "./notion";
import {
  syncSlack,
  syncSlackStreaming,
  validateSlackConnection,
} from "./slack";

function safeParseCursor<T>(cursor: string | undefined): T | undefined {
  if (!cursor) {
    return;
  }
  try {
    return JSON.parse(cursor) as T;
  } catch {
    return;
  }
}

export type FileDiscoveryHandler = (
  files: ConnectorFileInfo[],
  options: { connectorId: string; skipExisting: boolean; priority: number }
) => Promise<{
  queued: number;
  skipped: number;
  errors: number;
  mediaQueued: number;
}>;

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
  filesQueued: number;
  mediaQueued: number;
}

export interface SyncOptions {
  cursor?: string;
  batchSize?: number;
  forceFullSync?: boolean;
  onBatch?: (documents: GenericDocument[], cursor: string) => Promise<void>;
}

export interface ResourceInfo {
  id: string;
  name: string;
  resourceType: string;
  isPrivate?: boolean;
  isMember?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChannelInfo {
  id: string;
  name: string;
  is_private: boolean;
  is_member?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
}

function channelToResource(ch: ChannelInfo): ResourceInfo {
  let resourceType = "public_channel";
  if (ch.is_im) {
    resourceType = "dm";
  } else if (ch.is_mpim) {
    resourceType = "group_dm";
  } else if (ch.is_private) {
    resourceType = "private_channel";
  }

  return {
    id: ch.id,
    name: ch.name,
    resourceType,
    isPrivate: ch.is_private || ch.is_im || ch.is_mpim,
    isMember: ch.is_member,
    metadata: { is_im: ch.is_im, is_mpim: ch.is_mpim },
  };
}

function notionDatabaseToResource(db: NotionDatabase): ResourceInfo {
  const title = db.title?.[0]?.plain_text ?? "Untitled Database";
  return {
    id: db.id,
    name: title,
    resourceType: "database",
    isPrivate: false,
    isMember: true,
    metadata: {
      url: db.url,
      parentType: db.parent?.type,
    },
  };
}

function notionPageToResource(page: NotionPage): ResourceInfo {
  const properties = page.properties as Record<
    string,
    { type: string; title?: Array<{ plain_text: string }> }
  >;
  let title = "Untitled";
  for (const prop of Object.values(properties)) {
    if (prop.type === "title" && prop.title?.[0]) {
      title = prop.title[0].plain_text;
      break;
    }
  }

  const icon =
    page.icon?.type === "emoji" ? (page.icon as { emoji: string }).emoji : "";

  return {
    id: page.id,
    name: icon ? `${icon} ${title}` : title,
    resourceType: "page",
    isPrivate: false,
    isMember: true,
    metadata: {
      url: page.url,
      parentType: page.parent.type,
    },
  };
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
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
  onResourcesDiscovered?: (resources: ResourceInfo[]) => Promise<void>;
  onFilesDiscovered?: FileDiscoveryHandler;
  disabledResourceIds?: Set<string>;
  enabledResourceIds?: Set<string>;
  syncFiles?: boolean;
  syncCanvases?: boolean;
  syncClips?: boolean;
  syncBookmarks?: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: factory handles multiple connector types
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
    onStageChange,
    onResourcesDiscovered,
    onFilesDiscovered,
    disabledResourceIds,
    enabledResourceIds,
    syncFiles,
    syncCanvases,
    syncClips,
    syncBookmarks,
  } = options;

  switch (connector.app) {
    case "SLACK": {
      const slackCursor = safeParseCursor<SyncCursor>(cursor);

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
        onChannelsDiscovered: onResourcesDiscovered
          ? async (channels) => {
              await onResourcesDiscovered(channels.map(channelToResource));
            }
          : undefined,
        onFilesDiscovered,
        disabledChannelIds: disabledResourceIds,
        enabledChannelIds: enabledResourceIds,
        syncFiles,
        syncCanvases,
        syncClips,
        syncBookmarks,
      });

      return {
        totalDocuments: result.totalDocuments,
        nextCursor: JSON.stringify(result.cursor),
        hasMore: result.hasMore,
        stats: result.stats,
        filesQueued: result.filesQueued,
        mediaQueued: result.mediaQueued,
      };
    }

    case "GMAIL": {
      const gmailCursor = safeParseCursor<GmailSyncCursor>(cursor);

      const config = connector.config as Record<string, unknown> | null;
      const includeLabels = config?.include_labels
        ? String(config.include_labels)
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        : undefined;
      const excludeLabels = config?.exclude_labels
        ? String(config.exclude_labels)
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        : ["SPAM", "TRASH"];
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;
      const indexAttachments = config?.index_attachments !== false;

      const result = await syncGmailStreaming(connector, {
        cursor: gmailCursor,
        batchSize,
        forceFullSync,
        includeLabels,
        excludeLabels,
        lookbackDays,
        indexAttachments,
        indexMedia: indexAttachments,
        onBatch: async (batch) => {
          await onBatch({
            items: batch.items,
            cursor: JSON.stringify(batch.cursor),
            hasMore: batch.hasMore,
            stats: batch.stats,
          });
        },
        onLabelsDiscovered: onResourcesDiscovered
          ? async (labels) => {
              const resources: ResourceInfo[] = labels.map((label) => ({
                id: label.id,
                name: label.name,
                resourceType:
                  label.type === "system" ? "system_label" : "label",
                isPrivate: false,
                metadata: { labelType: label.type },
              }));
              await onResourcesDiscovered(resources);
            }
          : undefined,
        onFilesDiscovered,
      });

      return {
        totalDocuments: result.totalDocuments,
        nextCursor: JSON.stringify(result.cursor),
        hasMore: result.hasMore,
        stats: result.stats,
        filesQueued: result.filesQueued,
        mediaQueued: result.mediaQueued,
      };
    }

    case "GOOGLE_DRIVE": {
      const driveCursor = safeParseCursor<GoogleDriveSyncCursor>(cursor);

      const driveConfig = connector.config as Record<string, unknown> | null;
      const includeSharedDrives = driveConfig?.include_shared_drives !== false;
      const driveLookbackDays = driveConfig?.lookback_days
        ? Number(driveConfig.lookback_days)
        : undefined;
      const indexMedia = driveConfig?.index_media !== false;
      const extractContent = driveConfig?.extract_content !== false;

      const result = await syncGoogleDriveStreaming(connector, {
        cursor: driveCursor,
        batchSize,
        forceFullSync,
        includeSharedDrives,
        lookbackDays: driveLookbackDays,
        indexMedia,
        extractContent,
        onBatch: async (batch) => {
          await onBatch({
            items: batch.items,
            cursor: JSON.stringify(batch.cursor),
            hasMore: batch.hasMore,
            stats: batch.stats,
          });
        },
        onDrivesDiscovered: onResourcesDiscovered
          ? async (drives) => {
              const resources: ResourceInfo[] = drives.map((drive) => ({
                id: drive.id,
                name: drive.name,
                resourceType: drive.resourceType,
                isPrivate: drive.isPrivate,
                isMember: true,
                metadata: drive.metadata,
              }));
              await onResourcesDiscovered(resources);
            }
          : undefined,
        onFilesDiscovered,
      });

      return {
        totalDocuments: result.totalDocuments,
        nextCursor: JSON.stringify(result.cursor),
        hasMore: result.hasMore,
        stats: result.stats,
        filesQueued: result.filesQueued,
        mediaQueued: result.mediaQueued,
      };
    }

    case "NOTION": {
      const notionCursor = safeParseCursor<NotionSyncCursor>(cursor);

      const result = await syncNotionStreaming(connector, {
        cursor: notionCursor,
        batchSize,
        forceFullSync,
        onBatch,
        onStageChange,
        onDatabasesDiscovered: onResourcesDiscovered
          ? async (databases) => {
              await onResourcesDiscovered(
                databases.map(notionDatabaseToResource)
              );
            }
          : undefined,
        onPagesDiscovered: onResourcesDiscovered
          ? async (pages) => {
              await onResourcesDiscovered(pages.map(notionPageToResource));
            }
          : undefined,
      });

      return {
        totalDocuments: result.totalDocuments,
        nextCursor: JSON.stringify(result.cursor),
        hasMore: result.hasMore,
        stats: result.stats,
        filesQueued: result.filesQueued,
        mediaQueued: result.mediaQueued,
      };
    }

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
      const slackCursor = safeParseCursor<SyncCursor>(options.cursor);
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

    case "GMAIL":
      return validateGmailConnection(connector);

    case "GOOGLE_DRIVE":
      return validateGoogleDriveConnection(connector);

    case "NOTION":
      return validateNotionConnection(connector);

    default:
      throw new Error(`Unsupported connector app: ${connector.app}`);
  }
}
