import {
  createGmailClient,
  createGoogleCalendarClient,
  createGoogleChatClient,
  createGoogleDriveClient,
  createGoogleSitesClient,
  createLookerStudioClient,
  getValidAccessToken,
  gmailIncrementalSync,
  googleCalendarFullSync,
  googleCalendarIncrementalSync,
  googleChatFullSync,
  googleChatIncrementalSync,
  googleDriveIncrementalSync,
  googleSitesFullSync,
  googleSitesIncrementalSync,
  lookerStudioFullSync,
  lookerStudioIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import type { DiscoveredResourceRecord } from "../types";
import { registerSyncFactory } from "../unified-fetch-batch";
import {
  createDeleteMarker,
  parseBooleanConfig,
  parseNumericConfig,
  shouldRunFullSync,
} from "./helpers";

export function registerGoogleFactories(): void {
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
          cursor: batch.cursor as SyncCursor,
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
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
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
    "GOOGLE_SITES",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const client = createGoogleSitesClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        domain:
          ((connector.config as Record<string, unknown> | null)
            ?.domain as string) ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? googleSitesFullSync(client, context, {
            batchSize: 50,
          })
        : googleSitesIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
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
    "LOOKER_STUDIO",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Looker Studio connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createLookerStudioClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        domain:
          ((connector.config as Record<string, unknown> | null)
            ?.domain as string) ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? lookerStudioFullSync(client, context, {
            batchSize: 50,
          })
        : lookerStudioIncrementalSync(client, context, {
            cursor,
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
}
