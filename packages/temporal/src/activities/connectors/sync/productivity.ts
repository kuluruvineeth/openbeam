import {
  airtableFullSync,
  airtableIncrementalSync,
  canvaFullSync,
  canvaIncrementalSync,
  clickUpFullSync,
  clickUpIncrementalSync,
  codaFullSync,
  codaIncrementalSync,
  createAirtableClient,
  createCanvaClient,
  createClickUpClient,
  createCodaClient,
  createFigmaClient,
  createLucidClient,
  createMiroClient,
  createMondayClient,
  createSmartsheetClient,
  figmaFullSync,
  figmaIncrementalSync,
  getValidAccessToken,
  lucidFullSync,
  lucidIncrementalSync,
  miroFullSync,
  miroIncrementalSync,
  mondayFullSync,
  mondayIncrementalSync,
  smartsheetFullSync,
  smartsheetIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { LucidSyncCursor } from "@openbeam/types/services/connectors/lucid";
import type { SmartsheetSyncCursor } from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import {
  parseBooleanConfig,
  parseNumericConfig,
  shouldRunFullSync,
} from "./helpers";

export function registerProductivityFactories(): void {
  registerSyncFactory(
    "AIRTABLE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const includeBasesStr = (config?.include_bases as string) ?? "";
      const excludeBasesStr = (config?.exclude_bases as string) ?? "";
      const syncComments = config?.sync_comments !== false;

      const includeBases = includeBasesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const excludeBases = excludeBasesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const client = createAirtableClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? airtableFullSync(client, context, {
            batchSize: 100,
            includeBases,
            excludeBases,
            syncComments,
          })
        : airtableIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            includeBases,
            excludeBases,
            syncComments,
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
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "CODA",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for Coda connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncTables = parseBooleanConfig(config?.sync_tables) !== false;
      const syncRows = parseBooleanConfig(config?.sync_rows) !== false;

      const client = createCodaClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? codaFullSync(client, context, { syncTables, syncRows })
        : codaIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            syncTables,
            syncRows,
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
    "MIRO",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const includeBoardsStr = (config?.include_boards as string) ?? "";
      const excludeBoardsStr = (config?.exclude_boards as string) ?? "";
      const includeBoards = includeBoardsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const excludeBoards = excludeBoardsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const client = createMiroClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? miroFullSync(client, context, {
            batchSize: 100,
            includeBoards,
            excludeBoards,
          })
        : miroIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            includeBoards,
            excludeBoards,
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
    "CANVA",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const syncBrandTemplates = config?.sync_brand_templates !== false;
      const syncFolders = config?.sync_folders !== false;
      const syncComments = config?.sync_comments === true;

      const client = createCanvaClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? canvaFullSync(client, context, {
            batchSize: 100,
            syncBrandTemplates,
            syncFolders,
            syncComments,
          })
        : canvaIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            syncBrandTemplates,
            syncFolders,
            syncComments,
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
    "SMARTSHEET",
    async function* (connectorId, connector, cursor, syncType) {
      const smartsheetConfig = connector.config as Record<
        string,
        unknown
      > | null;
      const apiKey = smartsheetConfig?.apiKey as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for Smartsheet connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createSmartsheetClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? smartsheetFullSync(client, context, { batchSize: 100 })
        : smartsheetIncrementalSync(client, context, {
            cursor: cursor as SmartsheetSyncCursor | undefined,
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
    "LUCID",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Lucid connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const lucidConfig = connector.config as Record<string, unknown> | null;
      const lucidAccountId = (lucidConfig?.accountId as string) ?? "";

      const client = createLucidClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        accountId: lucidAccountId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? lucidFullSync(client, context, { batchSize: 100 })
        : lucidIncrementalSync(client, context, {
            cursor: cursor as LucidSyncCursor | undefined,
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
}
