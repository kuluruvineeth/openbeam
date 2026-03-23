import type { SharePointFileInfo } from "@openbeam/services";
import {
  asanaFullSync,
  asanaIncrementalSync,
  awsIotFullSync,
  awsIotIncrementalSync,
  azureDevOpsFullSync,
  azureDevOpsIncrementalSync,
  azureIotFullSync,
  azureIotIncrementalSync,
  bacnetFullSync,
  bacnetIncrementalSync,
  bitbucketFullSync,
  bitbucketIncrementalSync,
  boxFullSync,
  boxIncrementalSync,
  cisaKevFullSync,
  cisaKevIncrementalSync,
  clickUpFullSync,
  clickUpIncrementalSync,
  confluenceFullSync,
  confluenceIncrementalSync,
  createAsanaClient,
  createAtlassianClient,
  createAwsIotClient,
  createAzureDevOpsClient,
  createAzureIotClient,
  createBacnetClient,
  createBitbucketClient,
  createBoxClient,
  createClickUpClient,
  createDropboxClient,
  createFhirClient,
  createFigmaClient,
  createGitHubClient,
  createGitLabClient,
  createGmailClient,
  createGoogleCalendarClient,
  createGoogleChatClient,
  createGoogleDriveClient,
  createHubSpotClient,
  createIntercomClient,
  createLinearClient,
  createMatterportClient,
  createMicrosoftGraphClient,
  createMondayClient,
  createMqttConnectorClient,
  createNodeRedClient,
  createNotionClient,
  createNvdClient,
  createOmniverseClient,
  createOpcUaClient,
  createOwaspClient,
  createPagerDutyClient,
  createSalesforceClient,
  createSamsaraClient,
  createServiceNowClient,
  createSlackClient,
  createSmartThingsClient,
  createThingsboardClient,
  createVerkadaClient,
  createViamClient,
  createZendeskClient,
  createZoomClient,
  dropboxFullSync,
  dropboxIncrementalSync,
  fhirFullSync,
  fhirIncrementalSync,
  figmaFullSync,
  figmaIncrementalSync,
  getValidAccessToken,
  githubFullSync,
  githubIncrementalSync,
  gitlabFullSync,
  gitlabIncrementalSync,
  gmailIncrementalSync,
  googleCalendarFullSync,
  googleCalendarIncrementalSync,
  googleChatFullSync,
  googleChatIncrementalSync,
  googleDriveIncrementalSync,
  hubspotFullSync,
  hubspotIncrementalSync,
  intercomFullSync,
  intercomIncrementalSync,
  jiraFullSync,
  jiraIncrementalSync,
  linearFullSync,
  linearIncrementalSync,
  matterportFullSync,
  matterportIncrementalSync,
  microsoftCalendarFullSync,
  microsoftCalendarIncrementalSync,
  mitreAttackFullSync,
  mondayFullSync,
  mondayIncrementalSync,
  mqttFullSync,
  mqttIncrementalSync,
  nodeRedFullSync,
  nodeRedIncrementalSync,
  notionFullSync,
  notionIncrementalSync,
  nvdFullSync,
  nvdIncrementalSync,
  omniverseFullSync,
  omniverseIncrementalSync,
  opcUaFullSync,
  opcUaIncrementalSync,
  outlookIncrementalSync,
  owaspFullSync,
  pagerdutyFullSync,
  pagerdutyIncrementalSync,
  salesforceFullSync,
  salesforceIncrementalSync,
  samsaraFullSync,
  samsaraIncrementalSync,
  servicenowFullSync,
  servicenowIncrementalSync,
  sharepointFullSync,
  sharepointIncrementalSync,
  incrementalSync as slackIncrementalSync,
  smartThingsFullSync,
  smartThingsIncrementalSync,
  teamsIncrementalSync,
  thingsboardFullSync,
  thingsboardIncrementalSync,
  verkadaFullSync,
  verkadaIncrementalSync,
  viamFullSync,
  viamIncrementalSync,
  zendeskFullSync,
  zendeskIncrementalSync,
  zoomFullSync,
  zoomIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { ZoomSyncCursor } from "@openbeam/types/services/connectors/zoom";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../workflows/types";
import type { DiscoveredResourceRecord } from "./types";
import { registerSyncFactory } from "./unified-fetch-batch";

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

function shouldRunFullSync(
  syncType: string | undefined,
  cursor: SyncCursor | undefined
): boolean {
  if (syncType === "FULL") {
    return true;
  }
  if (syncType === "INCREMENTAL") {
    return false;
  }
  const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;
  if (forceFullSync) {
    return true;
  }
  const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
  return typeof lastSyncTime !== "number";
}

export function registerAllSyncFactories(): void {
  registerSyncFactory(
    "LINEAR",
    async function* (connectorId, connector, cursor, syncType) {
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
      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? linearFullSync(client, context, {
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
          })
        : linearIncrementalSync(client, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            batchSize: 100,
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
    async function* (connectorId, connector, cursor, syncType) {
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
        forceFullSync: shouldRunFullSync(syncType, cursor),
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
    async function* (connectorId, connector, cursor, syncType) {
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
        forceFullSync: shouldRunFullSync(syncType, cursor),
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
    async function* (connectorId, connector, cursor, syncType) {
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
      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? notionFullSync(client, context, {
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
          })
        : notionIncrementalSync(client, context, {
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
    async function* (connectorId, connector, cursor, syncType) {
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

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? samsaraFullSync(client, context, {
            batchSize: 100,
            syncAlerts,
            lookbackDays,
          })
        : samsaraIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
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
    async function* (connectorId, connector, cursor, syncType) {
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

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? verkadaFullSync(client, context, {
            pageSize: 100,
            syncCameras,
            syncDoors,
            syncSensors,
          })
        : verkadaIncrementalSync(client, context, { pageSize: 100 });

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
    "AWS_IOT",
    async function* (connectorId, connector, cursor, syncType) {
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

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? awsIotFullSync(client, context, {
            pageSize: 250,
            syncThingGroups,
            syncShadows,
          })
        : awsIotIncrementalSync(client, context, {
            pageSize: 250,
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
    "AZURE_IOT",
    async function* (connectorId, connector, cursor, syncType) {
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

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? azureIotFullSync(client, context, {
            pageSize: 100,
          })
        : azureIotIncrementalSync(client, context, {
            pageSize: 100,
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
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
    async function* (connectorId, connector, cursor, syncType) {
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

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? smartThingsFullSync(client, context, {
            pageSize: 200,
            syncScenes,
          })
        : smartThingsIncrementalSync(client, context, {
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

  registerSyncFactory(
    "JIRA",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const cloudId = (config?.cloudId as string) ?? "";
      const siteUrl = (config?.siteUrl as string) ?? "";
      const syncComments = config?.sync_comments !== false;
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;
      const includeProjects = config?.include_projects
        ? String(config.include_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
      const excludeProjects = config?.exclude_projects
        ? String(config.exclude_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
      const issueTypes = config?.issue_types
        ? String(config.issue_types)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;
      const statusFilter = config?.status_filter
        ? String(config.status_filter)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      if (!cloudId) {
        throw ApplicationFailure.nonRetryable(
          "Jira cloudId not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, cloudId, siteUrl }, "Jira sync config loaded");

      const client = createAtlassianClient({
        connectorId,
        accessToken,
        cloudId,
        product: "jira",
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        siteUrl,
        cloudId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? jiraFullSync(client, context, {
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            lookbackDays,
            issueTypes,
            statusFilter,
          })
        : jiraIncrementalSync(client, context, {
            cursor,
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            lookbackDays,
            issueTypes,
            statusFilter,
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
    "GITHUB",
    async function* (connectorId, connector, cursor, syncType) {
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

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? githubFullSync(client, context, {
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
          })
        : githubIncrementalSync(client, context, {
            lastSyncTime: (cursor?.lastSyncTime as number) ?? Date.now(),
            batchSize: 100,
            syncPRs,
            syncDiscussions,
            syncCommits,
            syncComments,
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
    "GITLAB",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for GitLab connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const instanceUrl = (config?.instance_url as string) || undefined;
      const syncMergeRequests = config?.sync_merge_requests !== false;
      const syncComments = config?.sync_comments !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const visibilityFilter =
        (config?.visibility_filter as string) || undefined;

      const includeGroupsRaw = (config?.include_groups as string) || "";
      const excludeGroupsRaw = (config?.exclude_groups as string) || "";
      const includeGroups = includeGroupsRaw
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      const excludeGroups = excludeGroupsRaw
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      logger.info(
        {
          connectorId,
          instanceUrl,
          syncMergeRequests,
          syncComments,
          lookbackDays,
          hasExistingCursor: !!cursor?.lastSyncTime,
        },
        "GitLab sync config loaded"
      );

      const client = createGitLabClient({
        connectorId,
        accessToken,
        instanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: instanceUrl ?? "https://gitlab.com",
      };

      const pendingResources: DiscoveredResourceRecord[] = [];
      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? gitlabFullSync(client, context, {
            batchSize: 100,
            syncMergeRequests,
            syncComments,
            lookbackDays,
            includeGroups,
            excludeGroups,
            visibilityFilter,
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onProjectsDiscovered: async (projects) => {
              for (const project of projects) {
                pendingResources.push({
                  externalId: String(project.id),
                  resourceType: "project",
                  name: project.path_with_namespace,
                  isPublic: project.visibility === "public",
                  metadata: {
                    description: project.description,
                    visibility: project.visibility,
                    starCount: project.star_count,
                  },
                });
              }
            },
          })
        : gitlabIncrementalSync(client, context, {
            lastSyncTime: (cursor?.lastSyncTime as number) ?? Date.now(),
            batchSize: 100,
            syncMergeRequests,
            syncComments,
            includeGroups,
            excludeGroups,
            visibilityFilter,
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
    "NVD",
    async function* (_connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey =
        (config?.api_key as string) || process.env.NVD_API_KEY || undefined;

      const client = createNvdClient({ connectorId: connector.id, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? nvdFullSync(client, context, { cursor, batchSize: 50 })
        : nvdIncrementalSync(client, context, { cursor, batchSize: 50 });

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
    "CISA_KEV",
    async function* (_connectorId, connector, cursor, syncType) {
      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? cisaKevFullSync(context, { batchSize: 50 })
        : cisaKevIncrementalSync(context, { cursor, batchSize: 50 });

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

  registerSyncFactory(
    "OUTLOOK",
    async function* (connectorId, connector, cursor) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";

      logger.info({ connectorId, userEmail }, "Outlook sync config loaded");

      const client = createMicrosoftGraphClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        userEmail,
      };

      for await (const batch of outlookIncrementalSync(client, context, {
        cursor,
        batchSize: 100,
      })) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "SHAREPOINT",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";

      logger.info({ connectorId, userEmail }, "SharePoint sync config loaded");

      const client = createMicrosoftGraphClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        userEmail,
      };

      const pendingResources: DiscoveredResourceRecord[] = [];

      const runFull = shouldRunFullSync(syncType, cursor);
      const hasValidCursor =
        cursor?.deltaLinks &&
        Object.keys(cursor.deltaLinks as Record<string, string>).length > 0;

      // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
      const onFilesDiscovered = async (files: SharePointFileInfo[]) => {
        for (const file of files) {
          pendingResources.push({
            externalId: `${file.driveId}_${file.itemId}`,
            resourceType: "file",
            name: file.name,
            metadata: {
              driveId: file.driveId,
              itemId: file.itemId,
              mimeType: file.mimeType,
              size: file.size,
            },
          });
        }
      };

      const syncGenerator =
        !runFull && hasValidCursor
          ? sharepointIncrementalSync(client, context, {
              cursor,
              batchSize: 100,
              onFilesDiscovered,
            })
          : sharepointFullSync(client, context, {
              batchSize: 100,
              onFilesDiscovered,
            });

      for await (const batch of syncGenerator) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "MICROSOFT_TEAMS",
    async function* (connectorId, connector, cursor) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";

      logger.info(
        { connectorId, userEmail },
        "Microsoft Teams sync config loaded"
      );

      const client = createMicrosoftGraphClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        userEmail,
      };

      for await (const batch of teamsIncrementalSync(client, context, {
        cursor,
        batchSize: 100,
      })) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "CONFLUENCE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const cloudId = (config?.cloudId as string) ?? "";
      const siteUrl = (config?.siteUrl as string) ?? "";
      const includeSpaces = config?.include_spaces
        ? String(config.include_spaces)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const excludeSpaces = config?.exclude_spaces
        ? String(config.exclude_spaces)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const syncComments = config?.sync_comments !== false;
      const labelsFilter = config?.labels_filter
        ? String(config.labels_filter)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const syncArchived = config?.sync_archived === true;

      if (!cloudId) {
        throw ApplicationFailure.nonRetryable(
          "Confluence cloudId not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info(
        { connectorId, cloudId, siteUrl, syncComments, syncArchived },
        "Confluence sync config loaded"
      );

      const client = createAtlassianClient({
        connectorId,
        accessToken,
        cloudId,
        product: "confluence",
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        siteUrl,
        cloudId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? confluenceFullSync(client, context, {
            batchSize: 100,
            includeSpaces,
            excludeSpaces,
            syncComments,
            labelsFilter,
            syncArchived,
          })
        : confluenceIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            includeSpaces,
            excludeSpaces,
            syncComments,
            labelsFilter,
            syncArchived,
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
    "SALESFORCE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const instanceUrl = (config?.instanceUrl as string) ?? "";
      const syncCases = config?.sync_cases !== false;
      const syncLeads = config?.sync_leads !== false;
      const syncCampaigns = config?.sync_campaigns === true;
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;

      if (!instanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Salesforce instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info(
        { connectorId, instanceUrl },
        "Salesforce sync config loaded"
      );

      const client = createSalesforceClient({
        connectorId,
        accessToken,
        instanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? salesforceFullSync(client, context, {
            batchSize: 200,
            syncCases,
            syncLeads,
            syncCampaigns,
            lookbackDays,
          })
        : salesforceIncrementalSync(client, context, {
            cursor,
            batchSize: 200,
            syncCases,
            syncLeads,
            syncCampaigns,
            lookbackDays,
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
    "HUBSPOT",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const portalId = (config?.portalId as string) ?? "";
      const syncContacts = config?.sync_contacts !== false;
      const syncCompanies = config?.sync_companies !== false;
      const syncDeals = config?.sync_deals !== false;
      const syncTickets = config?.sync_tickets !== false;
      const extraProperties =
        (config?.custom_properties as string)
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];

      if (!portalId) {
        throw ApplicationFailure.nonRetryable(
          "HubSpot portalId not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, portalId }, "HubSpot sync config loaded");

      const client = createHubSpotClient({
        connectorId,
        accessToken,
        portalId,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        portalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? hubspotFullSync(client, context, {
            batchSize: 100,
            syncContacts,
            syncCompanies,
            syncDeals,
            syncTickets,
            extraProperties,
          })
        : hubspotIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            syncContacts,
            syncCompanies,
            syncDeals,
            syncTickets,
            extraProperties,
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
    "BOX",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const enterpriseId = (config?.enterpriseId as string) ?? "";
      const rootFolderId = (config?.root_folder_id as string) || "0";

      logger.info({ connectorId, enterpriseId }, "Box sync config loaded");

      const client = createBoxClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        enterpriseId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? boxFullSync(client, context, { batchSize: 100, rootFolderId })
        : boxIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            rootFolderId,
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
    "DROPBOX",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const accountId = (config?.accountId as string) ?? "";

      logger.info({ connectorId, accountId }, "Dropbox sync config loaded");

      const client = createDropboxClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        accountId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? dropboxFullSync(client, context, { batchSize: 100 })
        : dropboxIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
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
    "GOOGLE_CALENDAR",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : 90;
      const includeCalendars = config?.include_calendars
        ? String(config.include_calendars)
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : undefined;

      logger.info(
        { connectorId, userEmail },
        "Google Calendar sync config loaded"
      );

      const client = createGoogleCalendarClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        userEmail,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? googleCalendarFullSync(client, context, {
            batchSize: 100,
            includeCalendars,
            lookbackDays,
          })
        : googleCalendarIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            includeCalendars,
            lookbackDays,
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
    "MICROSOFT_CALENDAR",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : 90;

      logger.info(
        { connectorId, userEmail },
        "Microsoft Calendar sync config loaded"
      );

      const client = createMicrosoftGraphClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        userEmail,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? microsoftCalendarFullSync(client, context, {
            batchSize: 100,
            lookbackDays,
          })
        : microsoftCalendarIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            lookbackDays,
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
    "MQTT",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const brokerUrl = config?.broker_url as string | undefined;
      if (!brokerUrl) {
        throw ApplicationFailure.nonRetryable(
          `No broker URL for MQTT connector ${connectorId}`,
          "ConfigurationError"
        );
      }

      const port = parseNumericConfig(config?.port, 8883) ?? 8883;
      const protocol = ((config?.protocol as string) ?? "mqtts") as
        | "mqtt"
        | "mqtts"
        | "ws"
        | "wss";
      const username = (config?.username as string) ?? undefined;
      const password = (config?.password as string) ?? undefined;
      const clientId =
        (config?.client_id as string) ?? `openbeam_${connectorId}`;

      logger.info(
        { connectorId, brokerUrl, port, protocol },
        "MQTT sync config loaded"
      );

      const client = createMqttConnectorClient({
        connection: {
          connectorId,
          brokerUrl,
          protocol,
          port,
          clientId,
          username,
          password,
          mqttVersion: ((config?.mqtt_version as string) ?? "5.0") as
            | "3.1.1"
            | "5.0",
          cleanStart: config?.clean_start !== false,
          sessionExpiryInterval:
            parseNumericConfig(config?.session_expiry_interval, 3600) ?? 3600,
          keepAlive: parseNumericConfig(config?.keep_alive, 60) ?? 60,
          reconnectPeriod:
            parseNumericConfig(config?.reconnect_period, 5000) ?? 5000,
          connectTimeout:
            parseNumericConfig(config?.connect_timeout, 30_000) ?? 30_000,
        },
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        brokerUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? mqttFullSync(client, context, { batchSize: 100 })
        : mqttIncrementalSync(client, context, { batchSize: 100 });

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
    "OPCUA",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const endpointUrl = config?.endpoint_url as string | undefined;
      if (!endpointUrl) {
        throw ApplicationFailure.nonRetryable(
          `No endpoint URL for OPC-UA connector ${connectorId}`,
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, endpointUrl }, "OPC-UA sync config loaded");

      const client = createOpcUaClient({
        connectorId,
        endpointUrl,
        applicationName:
          (config?.application_name as string) ?? "OpenBeam Gateway",
        keepAliveInterval:
          parseNumericConfig(config?.keep_alive_interval, 10_000) ?? 10_000,
        connectionTimeout:
          parseNumericConfig(config?.connection_timeout, 30_000) ?? 30_000,
        requestTimeout:
          parseNumericConfig(config?.request_timeout, 60_000) ?? 60_000,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        endpointUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? opcUaFullSync(client, context, { batchSize: 100 })
        : opcUaIncrementalSync(client, context, { batchSize: 100 });

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
    "BACNET",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const networkInterface =
        (config?.interface as string) ??
        (config?.network_interface as string) ??
        "0.0.0.0";
      const port = parseNumericConfig(config?.port, 47_808) ?? 47_808;
      const broadcastAddress =
        (config?.broadcast_address as string) ?? "255.255.255.255";

      logger.info(
        { connectorId, networkInterface, port, broadcastAddress },
        "BACnet sync config loaded"
      );

      const client = createBacnetClient({
        connectorId,
        interface: networkInterface,
        port,
        broadcastAddress,
        discoveryTimeout:
          parseNumericConfig(config?.discovery_timeout, 5000) ?? 5000,
        readTimeout: parseNumericConfig(config?.read_timeout, 3000) ?? 3000,
        covLifetime: parseNumericConfig(config?.cov_lifetime, 300) ?? 300,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        networkInterface,
        siteName: (config?.site_name as string) ?? undefined,
        buildingName: (config?.building_name as string) ?? undefined,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? bacnetFullSync(client, context, { batchSize: 100 })
        : bacnetIncrementalSync(client, context);

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
    "THINGSBOARD",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const baseUrl = config?.base_url as string | undefined;
      const username = config?.username as string | undefined;
      const password = config?.password as string | undefined;
      if (!(baseUrl && username && password)) {
        throw ApplicationFailure.nonRetryable(
          `Missing credentials for ThingsBoard connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncAlarms = config?.sync_alarms !== false;
      const syncDashboards = config?.sync_dashboards !== false;

      logger.info(
        { connectorId, baseUrl, syncAlarms, syncDashboards },
        "ThingsBoard sync config loaded"
      );

      const client = createThingsboardClient({
        connectorId,
        baseUrl,
        username,
        password,
        timeout: parseNumericConfig(config?.timeout, 30_000) ?? 30_000,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        baseUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? thingsboardFullSync(client, context, {
            pageSize: 100,
            syncAlarms,
            syncDashboards,
          })
        : thingsboardIncrementalSync(client, context, {
            pageSize: 100,
            syncAlarms,
            syncDashboards,
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
    "NODERED",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const baseUrl = config?.base_url as string | undefined;
      const accessToken = config?.access_token as string | undefined;
      if (!(baseUrl && accessToken)) {
        throw ApplicationFailure.nonRetryable(
          `Missing credentials for Node-RED connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncNodes = config?.sync_nodes !== false;

      logger.info(
        { connectorId, baseUrl, syncNodes },
        "Node-RED sync config loaded"
      );

      const client = createNodeRedClient({
        connectorId,
        baseUrl,
        accessToken,
        timeout: parseNumericConfig(config?.timeout, 30_000) ?? 30_000,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        baseUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? nodeRedFullSync(client, context, { syncNodes })
        : nodeRedIncrementalSync(client, context, { syncNodes });

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
    "MATTERPORT",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const tokenId = config?.token_id as string | undefined;
      const tokenSecret = config?.token_secret as string | undefined;
      if (!(tokenId && tokenSecret)) {
        throw ApplicationFailure.nonRetryable(
          `Missing API credentials for Matterport connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      logger.info({ connectorId }, "Matterport sync config loaded");

      const client = createMatterportClient({
        connectorId,
        tokenId,
        tokenSecret,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        apiEndpoint: "https://api.matterport.com/api/models/graph",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? matterportFullSync(client, context, { batchSize: 50 })
        : matterportIncrementalSync(client, context, {
            previousCursor: {
              lastSyncTimestamp:
                parseNumericConfig(cursor?.lastSyncTimestamp, 0) ?? 0,
              lastModelModified:
                (cursor?.lastModelModified as Record<string, string>) ?? {},
              processedModelIds: (cursor?.processedModelIds as string[]) ?? [],
            },
            batchSize: 50,
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
    "OMNIVERSE",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const nucleusUrl = config?.nucleus_url as string | undefined;
      const apiToken = config?.api_token as string | undefined;
      if (!(nucleusUrl && apiToken)) {
        throw ApplicationFailure.nonRetryable(
          `Missing credentials for Omniverse connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const projectPath = (config?.project_path as string) ?? "/";
      const stagePaths = config?.stage_paths
        ? String(config.stage_paths)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : ["/"];

      logger.info(
        { connectorId, nucleusUrl, projectPath },
        "Omniverse sync config loaded"
      );

      const client = createOmniverseClient({
        connectorId,
        nucleusUrl,
        apiToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        nucleusUrl,
        projectPath,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? omniverseFullSync(client, context, {
            batchSize: 100,
            stagePaths,
          })
        : omniverseIncrementalSync(client, context, {
            previousCursor: {
              lastSyncTimestamp:
                parseNumericConfig(cursor?.lastSyncTimestamp, 0) ?? 0,
              scannedStages: (cursor?.scannedStages as string[]) ?? [],
              currentStageIndex:
                parseNumericConfig(cursor?.currentStageIndex, 0) ?? 0,
              lastModifiedVersion:
                (cursor?.lastModifiedVersion as string) ?? undefined,
            },
            batchSize: 100,
            stagePaths,
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
    "VIAM",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      const apiKeyId = config?.api_key_id as string | undefined;
      const organizationId = config?.organization_id as string | undefined;
      if (!(apiKey && apiKeyId && organizationId)) {
        throw ApplicationFailure.nonRetryable(
          `Missing API credentials for Viam connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      logger.info({ connectorId, organizationId }, "Viam sync config loaded");

      const client = createViamClient({
        connectorId,
        apiKey,
        apiKeyId,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        organizationId,
        apiKeyId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? viamFullSync(client, context, { batchSize: 50 })
        : viamIncrementalSync(client, context, {
            previousCursor: {
              lastSyncTimestamp:
                parseNumericConfig(cursor?.lastSyncTimestamp, 0) ?? 0,
              lastMachineSync:
                (cursor?.lastMachineSync as Record<string, number>) ?? {},
              dataQueryCursor: (cursor?.dataQueryCursor as string) ?? undefined,
            },
            batchSize: 50,
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
    "FHIR",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const fhirBaseUrl = config?.fhir_base_url as string | undefined;
      const accessToken = config?.access_token as string | undefined;
      if (!(fhirBaseUrl && accessToken)) {
        throw ApplicationFailure.nonRetryable(
          `Missing credentials for FHIR connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const fhirVersion = ((config?.fhir_version as string) ?? "R4") as
        | "R4"
        | "R5";
      const deidentify = config?.deidentify !== false;
      const deidentificationStrategy = deidentify
        ? ((config?.deidentification_strategy as string) ?? "safe_harbor")
        : "none";

      logger.info(
        { connectorId, fhirBaseUrl, fhirVersion, deidentify },
        "FHIR sync config loaded"
      );

      const client = createFhirClient({
        connectorId,
        fhirBaseUrl,
        accessToken,
        fhirVersion,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        fhirBaseUrl,
        fhirVersion,
        deidentificationStrategy: deidentificationStrategy as
          | "safe_harbor"
          | "expert_determination"
          | "none",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? fhirFullSync(client, context, { batchSize: 50 })
        : fhirIncrementalSync(client, context, {
            previousCursor: {
              lastSyncTimestamp:
                parseNumericConfig(cursor?.lastSyncTimestamp, 0) ?? 0,
              subscriptionIds: (cursor?.subscriptionIds as string[]) ?? [],
              resourceTypeProgress:
                (cursor?.resourceTypeProgress as Record<string, string>) ?? {},
              lastTransactionTime:
                (cursor?.lastTransactionTime as string) ?? undefined,
              bulkExportJobId: (cursor?.bulkExportJobId as string) ?? undefined,
            },
            batchSize: 50,
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
    "ZENDESK",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const subdomain = (config?.subdomain as string) ?? "";
      const syncComments = config?.sync_comments === true;
      const syncArticles = config?.sync_articles !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const excludeClosedDays = parseNumericConfig(config?.exclude_closed_days);
      const tagsFilter = config?.tags_filter
        ? String(config.tags_filter)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      if (!subdomain) {
        throw ApplicationFailure.nonRetryable(
          "Zendesk subdomain not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info(
        {
          connectorId,
          subdomain,
          syncComments,
          syncArticles,
          lookbackDays,
          excludeClosedDays,
          tagsFilter,
        },
        "Zendesk sync config loaded"
      );

      const client = createZendeskClient({
        connectorId,
        accessToken,
        subdomain,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        subdomain,
      };

      const syncOptions = {
        batchSize: 100,
        syncComments,
        syncArticles,
        lookbackDays,
        tagsFilter,
        excludeClosedDays,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? zendeskFullSync(client, context, syncOptions)
        : zendeskIncrementalSync(client, context, {
            ...syncOptions,
            cursor,
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
    "INTERCOM",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const syncConversations = config?.sync_conversations !== false;
      const syncArticles = config?.sync_articles !== false;
      const syncCollections = config?.sync_collections !== false;
      const syncContacts = config?.sync_contacts === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const stateFilter = (config?.state_filter as string) || undefined;
      const tagsFilter = config?.tags_filter
        ? String(config.tags_filter)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      logger.info(
        {
          connectorId,
          syncConversations,
          syncArticles,
          syncCollections,
          syncContacts,
          lookbackDays,
          stateFilter,
          tagsFilter,
        },
        "Intercom sync config loaded"
      );

      const client = createIntercomClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        appId: (config?.appId as string) ?? undefined,
      };

      const syncOptions = {
        batchSize: 50,
        syncConversations,
        syncArticles,
        syncCollections,
        syncContacts,
        lookbackDays,
        stateFilter,
        tagsFilter,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? intercomFullSync(client, context, syncOptions)
        : intercomIncrementalSync(client, context, {
            ...syncOptions,
            cursor,
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
    "SERVICENOW",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const instance = (config?.instance as string) ?? "";

      if (!instance) {
        throw ApplicationFailure.nonRetryable(
          "ServiceNow instance name not found in connector config",
          "ConfigurationError"
        );
      }

      const syncKnowledge = (config?.sync_knowledge as boolean) ?? true;
      const syncChanges = (config?.sync_changes as boolean) ?? true;
      const lookbackDays = (config?.lookback_days as string) ?? "";
      const categoryFilter = (config?.category_filter as string) ?? "";
      const assignmentGroupFilter =
        (config?.assignment_group_filter as string) ?? "";

      logger.info(
        {
          connectorId,
          instance,
          syncKnowledge,
          syncChanges,
          lookbackDays,
          categoryFilter,
          assignmentGroupFilter,
        },
        "ServiceNow sync config loaded"
      );

      const client = createServiceNowClient({
        connectorId,
        accessToken,
        instance,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instance,
      };

      const syncOptions = {
        batchSize: 100,
        syncKnowledge,
        syncChanges,
        lookbackDays: lookbackDays ? Number(lookbackDays) : undefined,
        categoryFilter: categoryFilter
          ? categoryFilter.split(",").map((s: string) => s.trim())
          : undefined,
        assignmentGroupFilter: assignmentGroupFilter
          ? assignmentGroupFilter.split(",").map((s: string) => s.trim())
          : undefined,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? servicenowFullSync(client, context, syncOptions)
        : servicenowIncrementalSync(client, context, {
            ...syncOptions,
            cursor,
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
    "ASANA",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const workspaceGid = (config?.workspace_gid as string) ?? "";
      const syncComments = config?.sync_comments !== false;
      const syncCompletedTasks = config?.sync_completed_tasks === true;
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;
      const includeProjects = config?.include_projects
        ? String(config.include_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
      const excludeProjects = config?.exclude_projects
        ? String(config.exclude_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;

      if (!workspaceGid) {
        throw ApplicationFailure.nonRetryable(
          "Asana workspace_gid not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, workspaceGid }, "Asana sync config loaded");

      const client = createAsanaClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        workspaceGid,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? asanaFullSync(client, context, {
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            syncCompletedTasks,
            lookbackDays,
          })
        : asanaIncrementalSync(client, context, {
            cursor,
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            syncCompletedTasks,
            lookbackDays,
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
    "FIGMA",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const figmaTeamId = (config?.team_id as string) ?? "";
      const syncComments = config?.sync_comments !== false;
      const syncComponents = config?.sync_components === true;
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;
      const includeProjects = config?.include_projects
        ? String(config.include_projects)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const excludeProjects = config?.exclude_projects
        ? String(config.exclude_projects)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      if (!figmaTeamId) {
        throw ApplicationFailure.nonRetryable(
          "Figma team_id not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, figmaTeamId }, "Figma sync config loaded");

      const client = createFigmaClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        figmaTeamId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? figmaFullSync(client, context, {
            batchSize: 50,
            syncComments,
            syncComponents,
            lookbackDays,
            includeProjects,
            excludeProjects,
          })
        : figmaIncrementalSync(client, context, {
            cursor,
            batchSize: 50,
            syncComments,
            syncComponents,
            includeProjects,
            excludeProjects,
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
    "ZOOM",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const syncRecordings = config?.sync_recordings !== false;
      const syncTranscripts = config?.sync_transcripts !== false;
      const syncPastMeetings = config?.sync_past_meetings !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days) ?? 90;
      const includeUsers = config?.include_users
        ? String(config.include_users)
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : undefined;
      const excludeUsers = config?.exclude_users
        ? String(config.exclude_users)
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : undefined;
      const recordingTypesFilter = config?.recording_types_filter
        ? String(config.recording_types_filter)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      logger.info(
        {
          connectorId,
          syncRecordings,
          syncTranscripts,
          syncPastMeetings,
          lookbackDays,
        },
        "Zoom sync config loaded"
      );

      const client = createZoomClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        accountId: (config?.accountId as string) ?? undefined,
      };

      const syncOptions = {
        batchSize: 50,
        syncRecordings,
        syncTranscripts,
        syncPastMeetings,
        lookbackDays,
        includeUsers,
        excludeUsers,
        recordingTypesFilter,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? zoomFullSync(client, context, syncOptions)
        : zoomIncrementalSync(client, context, {
            ...syncOptions,
            cursor: cursor as ZoomSyncCursor,
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
    "BITBUCKET",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Bitbucket connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const workspace = (config?.workspace as string) ?? "";
      if (!workspace) {
        throw ApplicationFailure.nonRetryable(
          `No workspace configured for Bitbucket connector ${connectorId}`,
          "ConfigurationError"
        );
      }

      const syncPullRequests = config?.sync_pull_requests !== false;
      const syncIssues = config?.sync_issues !== false;
      const syncSnippets = config?.sync_snippets === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        {
          connectorId,
          workspace,
          syncPullRequests,
          syncIssues,
          syncSnippets,
          lookbackDays,
          hasExistingCursor: !!cursor?.lastSyncTime,
        },
        "Bitbucket sync config loaded"
      );

      const client = createBitbucketClient({
        connectorId,
        accessToken,
        workspace,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        workspaceSlug: workspace,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? bitbucketFullSync(client, context, {
            batchSize: 100,
            syncPullRequests,
            syncIssues,
            syncSnippets,
            lookbackDays,
          })
        : bitbucketIncrementalSync(client, context, {
            lastSyncTime: (cursor?.lastSyncTime as number) ?? Date.now(),
            batchSize: 100,
            syncPullRequests,
            syncIssues,
            syncSnippets,
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
    "MONDAY",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Monday connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createMondayClient({ connectorId, accessToken });
      const config = connector.config as Record<string, unknown> | null;

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        accountSlug: (config?.accountSlug as string) ?? undefined,
      };

      const syncUpdates = parseBooleanConfig(config?.sync_updates) !== false;
      const syncSubitems = parseBooleanConfig(config?.sync_subitems) === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const boardKindsFilter = config?.board_kinds_filter
        ? String(config.board_kinds_filter)
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : undefined;
      const includeBoardIds = config?.include_boards
        ? String(config.include_boards)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined;
      const excludeBoardIds = config?.exclude_boards
        ? String(config.exclude_boards)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined;

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? mondayFullSync(client, context, {
            batchSize: 100,
            syncUpdates,
            syncSubitems,
            lookbackDays,
            boardKindsFilter,
            includeBoardIds,
            excludeBoardIds,
          })
        : mondayIncrementalSync(client, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            batchSize: 100,
            syncUpdates,
            syncSubitems,
            boardKindsFilter,
            includeBoardIds,
            excludeBoardIds,
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
    "GOOGLE_CHAT",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : 90;
      const syncDirectMessages =
        parseBooleanConfig(config?.sync_direct_messages) === true;
      const includeSpaces = config?.include_spaces
        ? String(config.include_spaces)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const excludeSpaces = config?.exclude_spaces
        ? String(config.exclude_spaces)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      logger.info({ connectorId, userEmail }, "Google Chat sync config loaded");

      const client = createGoogleChatClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        userEmail,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? googleChatFullSync(client, context, {
            batchSize: 100,
            syncDirectMessages,
            includeSpaces,
            excludeSpaces,
            lookbackDays,
          })
        : googleChatIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            syncDirectMessages,
            includeSpaces,
            excludeSpaces,
            lookbackDays,
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
    "PAGERDUTY",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for PagerDuty connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncServices = config?.sync_services !== false;
      const syncSchedules = config?.sync_schedules !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);
      const urgencyFilter = (config?.urgency_filter as string) ?? undefined;
      const statusFilter = (config?.status_filter as string) ?? undefined;
      const serviceIdsRaw = (config?.service_ids_filter as string) ?? "";
      const serviceIdsFilter = serviceIdsRaw
        ? serviceIdsRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;

      logger.info(
        { connectorId, syncServices, syncSchedules, lookbackDays },
        "PagerDuty sync config loaded"
      );

      const client = createPagerDutyClient({
        connectorId,
        apiKey,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? pagerdutyFullSync(client, context, {
            batchSize: 100,
            syncServices,
            syncSchedules,
            lookbackDays,
            urgencyFilter,
            statusFilter,
            serviceIdsFilter,
          })
        : pagerdutyIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
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
    "CLICKUP",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for ClickUp connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const workspaceId =
        (config?.workspace_id as string) ?? connector.workspaceExternalId;

      if (!workspaceId) {
        throw ApplicationFailure.nonRetryable(
          `No workspace ID for ClickUp connector ${connectorId}`,
          "ConfigurationError"
        );
      }

      const syncComments = config?.sync_comments !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const includeSpaces = config?.include_spaces
        ? String(config.include_spaces)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;
      const excludeSpaces = config?.exclude_spaces
        ? String(config.exclude_spaces)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;

      const client = createClickUpClient({
        connectorId,
        accessToken,
        workspaceId,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        workspaceName: (config?.workspaceName as string) ?? undefined,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? clickUpFullSync(client, workspaceId, context, {
            batchSize: 100,
            syncComments,
            lookbackDays,
            includeSpaces,
            excludeSpaces,
          })
        : clickUpIncrementalSync(client, workspaceId, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            batchSize: 100,
            syncComments,
            includeSpaces,
            excludeSpaces,
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
    "AZURE_DEVOPS",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Azure DevOps connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const organization = config?.organization as string;
      if (!organization) {
        throw ApplicationFailure.nonRetryable(
          "Azure DevOps organization not configured",
          "ConfigurationError"
        );
      }

      const client = createAzureDevOpsClient({
        connectorId,
        accessToken,
        organization,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        organization,
        baseUrl: `https://dev.azure.com/${organization}`,
      };

      const includeProjects = config?.include_projects
        ? String(config.include_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
      const excludeProjects = config?.exclude_projects
        ? String(config.exclude_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
      const workItemTypes = config?.work_item_types
        ? String(config.work_item_types)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      const syncRepos = parseBooleanConfig(config?.sync_repos) ?? true;
      const syncPullRequests =
        parseBooleanConfig(config?.sync_pull_requests) ?? true;
      const syncWiki = parseBooleanConfig(config?.sync_wiki) ?? false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? azureDevOpsFullSync(client, context, {
            batchSize: 100,
            includeProjects,
            excludeProjects,
            syncRepos,
            syncPullRequests,
            syncWiki,
            workItemTypes,
            lookbackDays,
          })
        : azureDevOpsIncrementalSync(client, context, {
            cursor: cursor as Record<string, unknown> | undefined,
            batchSize: 100,
            includeProjects,
            excludeProjects,
            syncRepos,
            syncPullRequests,
            syncWiki,
            workItemTypes,
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
}
