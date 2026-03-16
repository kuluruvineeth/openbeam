import {
  awsIotFullSync,
  awsIotIncrementalSync,
  azureIotFullSync,
  azureIotIncrementalSync,
  cisaKevFullSync,
  cisaKevIncrementalSync,
  createAwsIotClient,
  createAzureIotClient,
  createGitHubClient,
  createGmailClient,
  createGoogleDriveClient,
  createLinearClient,
  createNotionClient,
  createNvdClient,
  createOwaspClient,
  createSamsaraClient,
  createSlackClient,
  createSmartThingsClient,
  createVerkadaClient,
  getValidAccessToken,
  githubFullSync,
  githubIncrementalSync,
  gmailIncrementalSync,
  googleDriveIncrementalSync,
  linearFullSync,
  linearIncrementalSync,
  mitreAttackFullSync,
  notionFullSync,
  notionIncrementalSync,
  nvdFullSync,
  nvdIncrementalSync,
  owaspFullSync,
  samsaraFullSync,
  samsaraIncrementalSync,
  incrementalSync as slackIncrementalSync,
  smartThingsFullSync,
  smartThingsIncrementalSync,
  verkadaFullSync,
  verkadaIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
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

function parseBooleanConfig(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  return;
}

function createDeleteMarker(params: {
  documentId: string;
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  externalId: string;
  documentType: string;
}): GenericDocument {
  return {
    id: params.documentId,
    connector_id: params.connectorId,
    connector_type: params.connectorType,
    team_id: params.teamId,
    workspace_id: params.workspaceId,
    external_id: params.externalId,
    document_type: params.documentType,
    title: "",
    content: "",
    created_at: 0,
    updated_at: Date.now(),
    is_public: false,
    metadata: {
      deleted: true,
      deletedAt: Date.now(),
    },
  };
}

// biome-ignore lint/suspicious/useAwait: async required for AsyncGenerator type compatibility
async function* createEmptySyncGenerator(): AsyncGenerator<SyncBatch> {
  yield { items: [], hasMore: false };
}

export function registerAllSyncFactories(): void {
  registerSyncFactory(
    "LINEAR",
    async function* (connectorId, connector, cursor) {
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
      const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
      const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

      const syncGenerator =
        !forceFullSync && typeof lastSyncTime === "number"
          ? linearIncrementalSync(client, context, {
              lastSyncTime,
              batchSize: 100,
            })
          : linearFullSync(client, context, {
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
            });

      for await (const batch of syncGenerator) {
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
                attachmentId: attachment.attachmentId,
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
                attachmentId: item.attachmentId,
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
    async function* (connectorId, connector, cursor) {
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
      const pendingDeletedDocumentIds: string[] = [];

      for await (const batch of googleDriveIncrementalSync(client, context, {
        batchSize: 100,
        cursor,
        forceFullSync: parseBooleanConfig(cursor?.forceFullSync) === true,
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
        onDocumentsRemoved: async (documentIds) => {
          pendingDeletedDocumentIds.push(...documentIds);
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

        const deletedItems = pendingDeletedDocumentIds.map((documentId) => {
          const prefix = `${connector.id}_file_`;
          const externalId = documentId.startsWith(prefix)
            ? documentId.slice(prefix.length)
            : documentId;

          return createDeleteMarker({
            documentId,
            connectorId: connector.id,
            connectorType: connector.type,
            teamId: connector.teamId,
            workspaceId: connector.workspaceExternalId,
            externalId,
            documentType: "file",
          });
        });
        pendingDeletedDocumentIds.length = 0;

        yield {
          items: [...(batch.items as GenericDocument[]), ...deletedItems],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "SLACK",
    async function* (connectorId, connector, cursor) {
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

      for await (const batch of slackIncrementalSync(client, context, {
        cursor,
        forceFullSync: parseBooleanConfig(cursor?.forceFullSync) === true,
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
            const downloadUrl =
              file.downloadStrategy.type === "url"
                ? file.downloadStrategy.downloadUrl
                : undefined;

            const resourceType = file.mimeType.startsWith("video/")
              ? "video"
              : "file";
            const finalResourceType = file.mimeType.startsWith("audio/")
              ? "audio"
              : resourceType;

            pendingResources.push({
              externalId: file.id,
              resourceType: finalResourceType,
              name: file.name,
              metadata: {
                mimeType: file.mimeType,
                size: file.size,
                downloadUrl,
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
    }
  );

  registerSyncFactory(
    "NOTION",
    async function* (connectorId, connector, cursor) {
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
      const useIncremental =
        typeof parseNumericConfig(cursor?.lastSyncTime) === "number" &&
        parseBooleanConfig(cursor?.forceFullSync) !== true;

      const syncGenerator = useIncremental
        ? notionIncrementalSync(client, context, {
            batchSize: 5,
            cursor,
            extractContent,
            extractComments,
            maxBlockDepth,
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
                const title =
                  titleProp?.title?.[0]?.plain_text ?? "Untitled Page";

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
          })
        : notionFullSync(client, context, {
            batchSize: 5,
            cursor,
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
                const title =
                  titleProp?.title?.[0]?.plain_text ?? "Untitled Page";

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
          });

      for await (const batch of syncGenerator) {
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
    "SAMSARA",
    async function* (connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const apiToken = config?.api_token as string | undefined;
      if (!apiToken) {
        throw ApplicationFailure.nonRetryable(
          `No API token for Samsara connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const region = ((config?.region as string) ?? "us") as "us" | "eu";
      const apiVersion = (config?.api_version as string) ?? "2024-06-01";
      const syncAlerts = config?.sync_alerts !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        { connectorId, region, syncAlerts, lookbackDays },
        "Samsara sync config loaded"
      );

      const client = createSamsaraClient({
        connectorId,
        apiToken,
        region,
        apiVersion,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        organizationId: (config?.organization_id as string) ?? undefined,
        organizationName: (config?.organization_name as string) ?? undefined,
        region,
      };

      const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
      const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

      const syncGenerator =
        !forceFullSync && typeof lastSyncTime === "number"
          ? samsaraIncrementalSync(client, context, {
              cursor,
              batchSize: 100,
            })
          : samsaraFullSync(client, context, {
              batchSize: 100,
              syncAlerts,
              lookbackDays,
            });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "VERKADA",
    async function* (connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for Verkada connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const region = ((config?.region as string) ?? "us") as "us" | "eu" | "au";
      const syncCameras = config?.sync_cameras !== false;
      const syncDoors = config?.sync_doors !== false;
      const syncSensors = config?.sync_sensors !== false;

      logger.info(
        { connectorId, region, syncCameras, syncDoors, syncSensors },
        "Verkada sync config loaded"
      );

      const client = createVerkadaClient({
        connectorId,
        apiKey,
        region,
      });

      const context = {
        connectorId: connector.id,
        connectorType: "VERKADA" as const,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        organizationId: (config?.organization_id as string) ?? "",
        organizationName: (config?.organization_name as string) ?? "",
        region,
      };

      const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
      const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

      const syncGenerator =
        !forceFullSync && typeof lastSyncTime === "number"
          ? verkadaIncrementalSync(client, context, { pageSize: 100 })
          : verkadaFullSync(client, context, {
              pageSize: 100,
              syncCameras,
              syncDoors,
              syncSensors,
            });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "AWS_IOT_CORE",
    async function* (connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const accessKeyId = config?.access_key_id as string | undefined;
      const secretAccessKey = config?.secret_access_key as string | undefined;
      if (!(accessKeyId && secretAccessKey)) {
        throw ApplicationFailure.nonRetryable(
          `No AWS credentials for AWS IoT Core connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const region = ((config?.region as string) ?? "us-east-1") as
        | "us-east-1"
        | "us-east-2"
        | "us-west-1"
        | "us-west-2"
        | "eu-west-1"
        | "eu-west-2"
        | "eu-central-1"
        | "ap-northeast-1"
        | "ap-southeast-1"
        | "ap-southeast-2";
      const syncThingGroups = config?.sync_thing_groups !== false;
      const syncShadows = config?.sync_shadows !== false;

      logger.info(
        { connectorId, region, syncThingGroups, syncShadows },
        "AWS IoT Core sync config loaded"
      );

      const client = createAwsIotClient({
        connectorId,
        accessKeyId,
        secretAccessKey,
        region,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        region,
        accountId: (config?.account_id as string) ?? undefined,
      };

      const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
      const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

      const syncGenerator =
        !forceFullSync && typeof lastSyncTime === "number"
          ? awsIotIncrementalSync(client, context, {
              pageSize: 250,
              syncShadows,
            })
          : awsIotFullSync(client, context, {
              pageSize: 250,
              syncThingGroups,
              syncShadows,
            });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "AZURE_IOT_HUB",
    async function* (connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const connectionString = config?.connection_string as string | undefined;
      if (!connectionString) {
        throw ApplicationFailure.nonRetryable(
          `No connection string for Azure IoT Hub connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      logger.info({ connectorId }, "Azure IoT Hub sync config loaded");

      const client = createAzureIotClient({
        connectorId,
        connectionString,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        hubName: client.hubName,
      };

      const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
      const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

      const syncGenerator =
        !forceFullSync && typeof lastSyncTime === "number"
          ? azureIotIncrementalSync(client, context, {
              pageSize: 100,
              lastSyncTime,
            })
          : azureIotFullSync(client, context, {
              pageSize: 100,
            });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "SMARTTHINGS",
    async function* (connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const accessToken = config?.access_token as string | undefined;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for SmartThings connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncScenes = config?.sync_scenes !== false;

      logger.info(
        { connectorId, syncScenes },
        "SmartThings sync config loaded"
      );

      const client = createSmartThingsClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
      const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

      const syncGenerator =
        !forceFullSync && typeof lastSyncTime === "number"
          ? smartThingsIncrementalSync(client, context, {
              pageSize: 200,
              syncScenes,
            })
          : smartThingsFullSync(client, context, {
              pageSize: 200,
              syncScenes,
            });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory("JIRA", createEmptySyncGenerator);

  registerSyncFactory(
    "GITHUB",
    async function* (connectorId, connector, cursor) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for GitHub connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const organizationName =
        (config?.organizationName as string) ??
        (config?.organization_name as string) ??
        "";
      const syncPRs = config?.sync_prs !== false;
      const syncDiscussions = config?.sync_discussions === true;
      const syncCommits = config?.sync_commits === true;
      const syncComments = config?.sync_comments !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        {
          connectorId,
          organizationName,
          syncPRs,
          syncDiscussions,
          syncCommits,
          syncComments,
          lookbackDays,
          hasExistingCursor: !!cursor?.lastSyncTime,
          rawConfig: config,
        },
        "GitHub sync config loaded"
      );

      const client = createGitHubClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        organizationName,
      };

      const pendingResources: DiscoveredResourceRecord[] = [];

      const useIncremental = cursor?.lastSyncTime && !cursor?.forceFullSync;

      const syncGenerator = useIncremental
        ? githubIncrementalSync(client, context, {
            lastSyncTime: cursor.lastSyncTime as number,
            batchSize: 100,
            syncPRs,
            syncDiscussions,
            syncCommits,
            syncComments,
          })
        : githubFullSync(client, context, {
            batchSize: 100,
            syncPRs,
            syncDiscussions,
            syncCommits,
            syncComments,
            lookbackDays,
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onReposDiscovered: async (repos) => {
              for (const repo of repos) {
                pendingResources.push({
                  externalId: String(repo.id),
                  resourceType: "repository",
                  name: repo.full_name,
                  isPublic: !repo.private,
                  metadata: {
                    description: repo.description,
                    language: repo.language,
                    stargazersCount: repo.stargazers_count,
                  },
                });
              }
            },
          });

      for await (const batch of syncGenerator) {
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

  registerSyncFactory("NVD", async function* (connectorId, connector, cursor) {
    const config = connector.config as Record<string, unknown> | null;
    const apiKey =
      (config?.api_key as string) || process.env.NVD_API_KEY || undefined;

    const client = createNvdClient({ connectorId, apiKey });

    const context = {
      connectorId: connector.id,
      connectorType: connector.type,
      teamId: connector.teamId,
      workspaceId: connector.workspaceExternalId,
    };

    const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
    const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

    const syncGenerator =
      !forceFullSync && typeof lastSyncTime === "number"
        ? nvdIncrementalSync(client, context, { cursor, batchSize: 50 })
        : nvdFullSync(client, context, { cursor, batchSize: 50 });

    for await (const batch of syncGenerator) {
      yield {
        items: batch.items as GenericDocument[],
        cursor: batch.cursor,
        hasMore: batch.hasMore,
      };
    }
  });

  registerSyncFactory(
    "CISA_KEV",
    async function* (_connectorId, connector, cursor) {
      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
      const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;

      const syncGenerator =
        !forceFullSync && typeof lastSyncTime === "number"
          ? cisaKevIncrementalSync(context, { cursor, batchSize: 50 })
          : cisaKevFullSync(context, { batchSize: 50 });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "MITRE_ATTACK",
    async function* (_connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const domainsStr = (config?.domains as string) ?? "enterprise,mobile,ics";
      const domains = domainsStr
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean) as Array<"enterprise" | "mobile" | "ics">;

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        domain: "",
      };

      const syncGenerator = mitreAttackFullSync(context, {
        cursor,
        batchSize: 50,
        domains,
      });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "OWASP",
    async function* (connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const projectsStr =
        (config?.projects as string) ?? "top10,cheatSheets,asvs,wstg";
      const projects = projectsStr
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean) as Array<"top10" | "cheatSheets" | "asvs" | "wstg">;

      const client = createOwaspClient(connectorId);

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const syncGenerator = owaspFullSync(client, context, {
        cursor,
        batchSize: 20,
        projects,
      });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory("CONFLUENCE", createEmptySyncGenerator);
  registerSyncFactory("ZENDESK", createEmptySyncGenerator);
}
