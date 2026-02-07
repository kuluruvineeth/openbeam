import {
  createGmailClient,
  createGoogleDriveClient,
  createLinearClient,
  createNotionClient,
  createSlackClient,
  getValidAccessToken,
  linearFullSync,
  notionFullSync,
  fullSync as slackFullSync,
} from "@openplane/services";
import { gmailIncrementalSync } from "@openplane/services/gmail/sync/incremental";
import { fullSync as driveFullSync } from "@openplane/services/google-drive/sync/full";
import { logger } from "@openplane/services/lib/logger";
import type { GenericDocument } from "@openplane/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../workflows/types";
import type { DiscoveredResourceRecord } from "./types";
import { registerSyncFactory } from "./unified-fetch-batch";

type SyncBatch = {
  items: GenericDocument[];
  cursor?: SyncCursor;
  hasMore?: boolean;
  discoveredResources?: DiscoveredResourceRecord[];
};

function parseNumericConfig(
  value: unknown,
  fallback?: number
): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

// biome-ignore lint/suspicious/useAwait: async required for AsyncGenerator type compatibility
async function* createEmptySyncGenerator(): AsyncGenerator<SyncBatch> {
  yield { items: [], hasMore: false };
}

export function registerAllSyncFactories(): void {
  registerSyncFactory(
    "LINEAR",
    async function* (connectorId, connector, _cursor) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Linear connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createLinearClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const pendingResources: DiscoveredResourceRecord[] = [];

      for await (const batch of linearFullSync(client, context, {
        batchSize: 100,
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onTeamsDiscovered: async (teams) => {
          for (const team of teams) {
            pendingResources.push({
              externalId: team.id,
              resourceType: "team",
              name: team.name,
              isPublic: true,
              metadata: {},
            });
          }
        },
      })) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "GMAIL",
    async function* (connectorId, connector, cursor) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Gmail connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";

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
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const indexAttachments = config?.index_attachments !== false;

      logger.info(
        {
          connectorId,
          userEmail,
          includeLabels,
          excludeLabels,
          lookbackDays,
          indexAttachments,
          rawConfig: config,
        },
        "Gmail sync config loaded"
      );

      const client = createGmailClient({ connectorId, accessToken, userEmail });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        userEmail,
      };

      const pendingResources: DiscoveredResourceRecord[] = [];

      for await (const batch of gmailIncrementalSync(client, context, {
        batchSize: 100,
        cursor,
        includeLabels,
        excludeLabels,
        lookbackDays,
        indexAttachments,
        indexMedia: indexAttachments,
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onAttachmentsDiscovered: async (attachments) => {
          for (const attachment of attachments) {
            pendingResources.push({
              externalId: `${attachment.messageId}_${attachment.attachmentId}`,
              resourceType: "attachment",
              name: attachment.filename,
              metadata: {
                messageId: attachment.messageId,
                threadId: attachment.threadId,
                mimeType: attachment.mimeType,
                size: attachment.size,
                senderEmail: attachment.senderEmail,
                senderName: attachment.senderName,
              },
            });
          }
        },
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onMediaDiscovered: async (media) => {
          for (const item of media) {
            pendingResources.push({
              externalId: `${item.messageId}_${item.attachmentId}`,
              resourceType: item.mediaType,
              name: item.filename,
              metadata: {
                messageId: item.messageId,
                threadId: item.threadId,
                mimeType: item.mimeType,
                size: item.size,
                mediaType: item.mediaType,
                senderEmail: item.senderEmail,
                senderName: item.senderName,
              },
            });
          }
        },
      })) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "GOOGLE_DRIVE",
    async function* (connectorId, connector, _cursor) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Google Drive connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const userEmail =
        (config?.userEmail as string) ??
        (config?.delegatedEmail as string) ??
        "";
      const includeSharedDrives = config?.include_shared_drives !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const indexMedia = config?.index_media !== false;
      const extractContent = config?.extract_content !== false;

      logger.info(
        {
          connectorId,
          userEmail,
          includeSharedDrives,
          lookbackDays,
          indexMedia,
          extractContent,
          rawConfig: config,
        },
        "Google Drive sync config loaded"
      );

      const client = createGoogleDriveClient({
        connectorId,
        accessToken,
        userEmail,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        userEmail,
      };

      const pendingResources: DiscoveredResourceRecord[] = [];

      for await (const batch of driveFullSync(client, context, {
        batchSize: 100,
        includeSharedDrives,
        lookbackDays,
        indexMedia,
        extractContent,
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onMediaDiscovered: async (media) => {
          for (const item of media) {
            pendingResources.push({
              externalId: item.fileId,
              resourceType: item.mediaType,
              name: item.name,
              metadata: {
                mimeType: item.mimeType,
                size: item.size,
                mediaType: item.mediaType,
                webViewLink: item.webViewLink,
                thumbnailLink: item.thumbnailLink,
              },
            });
          }
        },
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onFilesDiscovered: async (files) => {
          for (const file of files) {
            pendingResources.push({
              externalId: file.id,
              resourceType: "file",
              name: file.name,
              metadata: {
                mimeType: file.mimeType,
                size: file.size,
                permalink: file.permalink,
                createdAt: file.createdAt,
              },
            });
          }
        },
      })) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory("SLACK", async function* (connectorId, connector) {
    const token = await getValidAccessToken(connectorId);
    const client = createSlackClient({ token, connectorId });

    const context = {
      connectorId: connector.id,
      connectorType: connector.type,
      teamId: connector.teamId,
      workspaceId: connector.workspaceExternalId,
    };

    const config = connector.config as Record<string, unknown> | null;
    const indexDms = config?.index_dms === true;
    const indexGroupDms =
      config?.index_group_dms === true ||
      config?.federated_include_group_dms === true;
    const syncFiles = config?.sync_files !== false;
    const syncCanvases = config?.index_canvases !== false;
    const syncClips = config?.index_clips !== false;
    const syncBookmarks = config?.index_bookmarks !== false;

    const disabledChannelIds = connector.disabledResourceIds
      ? new Set(connector.disabledResourceIds)
      : undefined;

    logger.info(
      {
        connectorId,
        indexDms,
        indexGroupDms,
        syncFiles,
        syncCanvases,
        syncClips,
        syncBookmarks,
        disabledChannelCount: disabledChannelIds?.size ?? 0,
        rawConfig: config,
      },
      "Slack sync config loaded"
    );

    const pendingResources: DiscoveredResourceRecord[] = [];

    for await (const batch of slackFullSync(client, context, {
      channelOptions: {
        indexDms,
        indexGroupDms,
      },
      disabledChannelIds,
      syncFiles,
      syncCanvases,
      syncClips,
      syncBookmarks,
      // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
      onChannelsDiscovered: async (channels) => {
        for (const channel of channels) {
          pendingResources.push({
            externalId: channel.id,
            resourceType: channel.is_private ? "private_channel" : "channel",
            name: channel.name,
            isPublic: !channel.is_private,
            metadata: {
              isArchived: channel.is_archived,
              isGeneral: channel.is_general,
              isShared: channel.is_shared,
              creator: channel.creator,
              numMembers: channel.num_members,
              created: channel.created,
            },
          });
        }
      },
      // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
      onFilesDiscovered: async (files) => {
        for (const file of files) {
          pendingResources.push({
            externalId: file.id,
            resourceType: "file",
            name: file.name,
            metadata: {
              mimeType: file.mimeType,
              size: file.size,
              permalink: file.permalink,
              createdAt: file.createdAt,
              userId: file.userId,
              userName: file.userName,
              sourceChannelId: file.sourceChannelId,
            },
          });
        }
      },
    })) {
      const resourcesToYield =
        pendingResources.length > 0 ? [...pendingResources] : undefined;
      if (resourcesToYield) {
        pendingResources.length = 0;
      }

      yield {
        items: batch.items as GenericDocument[],
        cursor: batch.cursor,
        hasMore: batch.hasMore,
        discoveredResources: resourcesToYield,
      };
    }
  });

  registerSyncFactory(
    "NOTION",
    async function* (connectorId, connector, _cursor) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Notion connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createNotionClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const config = connector.config as Record<string, unknown> | null;
      const extractContent = config?.extract_content !== false;
      const extractComments = config?.extract_comments !== false;
      const maxBlockDepth = parseNumericConfig(config?.max_block_depth, 10);
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        {
          connectorId,
          extractContent,
          extractComments,
          maxBlockDepth,
          lookbackDays,
          rawConfig: config,
        },
        "Notion sync config loaded"
      );

      const pendingResources: DiscoveredResourceRecord[] = [];

      for await (const batch of notionFullSync(client, context, {
        batchSize: 5,
        extractContent,
        extractComments,
        maxBlockDepth,
        lookbackDays,
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onDatabasesDiscovered: async (databases) => {
          for (const db of databases) {
            pendingResources.push({
              externalId: db.id,
              resourceType: "database",
              name: db.title?.[0]?.plain_text ?? "Untitled Database",
              isPublic: !db.archived,
              metadata: {
                url: db.url,
                createdTime: db.created_time,
                lastEditedTime: db.last_edited_time,
              },
            });
          }
        },
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onPagesDiscovered: async (pages) => {
          for (const page of pages) {
            const titleProp = Object.values(page.properties).find(
              (p) => (p as { type: string }).type === "title"
            ) as { title?: Array<{ plain_text: string }> } | undefined;
            const title = titleProp?.title?.[0]?.plain_text ?? "Untitled Page";

            pendingResources.push({
              externalId: page.id,
              resourceType: "page",
              name: title,
              isPublic: !(page.archived || page.in_trash),
              metadata: {
                url: page.url,
                createdTime: page.created_time,
                lastEditedTime: page.last_edited_time,
                parentType: page.parent.type,
              },
            });
          }
        },
      })) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory("JIRA", createEmptySyncGenerator);
  registerSyncFactory("GITHUB", createEmptySyncGenerator);
  registerSyncFactory("CONFLUENCE", createEmptySyncGenerator);
  registerSyncFactory("ZENDESK", createEmptySyncGenerator);
}
