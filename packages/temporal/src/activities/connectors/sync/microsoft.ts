import type { SharePointFileInfo } from "@openbeam/services";
import {
  createMicrosoftGraphClient,
  getValidAccessToken,
  microsoftCalendarFullSync,
  microsoftCalendarIncrementalSync,
  onenoteIncrementalSync,
  outlookIncrementalSync,
  sharepointFullSync,
  sharepointIncrementalSync,
  teamsIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import type { SyncCursor } from "../../../workflows/types";
import type { DiscoveredResourceRecord } from "../types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseBooleanConfig, shouldRunFullSync } from "./helpers";

export function registerMicrosoftFactories(): void {
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
    "ONENOTE",
    async function* (connectorId, connector, cursor) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const userEmail = (config?.userEmail as string) ?? "";
      const syncPageContent =
        parseBooleanConfig(config?.sync_page_content) ?? true;
      const includeNotebooksRaw = (config?.include_notebooks as string) ?? "";
      const excludeNotebooksRaw = (config?.exclude_notebooks as string) ?? "";
      const includeNotebooks = includeNotebooksRaw
        ? includeNotebooksRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
      const excludeNotebooks = excludeNotebooksRaw
        ? excludeNotebooksRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

      logger.info({ connectorId, userEmail }, "OneNote sync config loaded");

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

      for await (const batch of onenoteIncrementalSync(client, context, {
        cursor,
        batchSize: 50,
        syncPageContent,
        includeNotebooks,
        excludeNotebooks,
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
}
