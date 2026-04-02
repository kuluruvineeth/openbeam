import {
  bamboohrFullSync,
  bamboohrIncrementalSync,
  createBambooHRClient,
  createDocuSignClient,
  createFellowClient,
  createFifteenFiveClient,
  createGreenhouseClient,
  createHarvestClient,
  createWorkdayClient,
  docuSignFullSync,
  docuSignIncrementalSync,
  fellowFullSync,
  fellowIncrementalSync,
  fifteenFiveFullSync,
  fifteenFiveIncrementalSync,
  getValidAccessToken,
  greenhouseFullSync,
  greenhouseIncrementalSync,
  harvestFullSync,
  harvestIncrementalSync,
  workdayFullSync,
  workdayIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import {
  parseBooleanConfig,
  parseNumericConfig,
  shouldRunFullSync,
} from "./helpers";

export function registerHrTalentFactories(): void {
  registerSyncFactory(
    "BAMBOOHR",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      const subdomain = config?.subdomain as string | undefined;
      if (!(apiKey && subdomain)) {
        throw ApplicationFailure.nonRetryable(
          `No API key or subdomain for BambooHR connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncTerminated =
        parseBooleanConfig(config?.sync_terminated) === true;
      const syncTimeOff = parseBooleanConfig(config?.sync_time_off) !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);

      const client = createBambooHRClient({
        connectorId,
        apiKey,
        subdomain,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        subdomain,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? bamboohrFullSync(client, context, {
            syncTerminated,
            syncTimeOff,
            lookbackDays,
          })
        : bamboohrIncrementalSync(client, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            syncTerminated,
            syncTimeOff,
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
    "GREENHOUSE",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for Greenhouse connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncCandidates =
        parseBooleanConfig(config?.sync_candidates) !== false;
      const syncApplications =
        parseBooleanConfig(config?.sync_applications) !== false;
      const syncOffers = parseBooleanConfig(config?.sync_offers) === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 0);
      const statusFilter = (config?.status_filter as string) ?? "";
      const departmentFilter = (config?.department_filter as string) ?? "";

      const client = createGreenhouseClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      let departmentId: number | undefined;
      if (departmentFilter) {
        const departments = await client.getDepartments();
        const match = departments.find(
          (d) => d.name.toLowerCase() === departmentFilter.toLowerCase()
        );
        departmentId = match?.id;
      }

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? greenhouseFullSync(client, context, {
            syncCandidates,
            syncApplications,
            syncOffers,
            lookbackDays,
            statusFilter,
            departmentId,
          })
        : greenhouseIncrementalSync(client, context, {
            cursor: {
              lastSyncTime: parseNumericConfig(cursor?.lastSyncTime),
            },
            syncCandidates,
            syncApplications,
            syncOffers,
            statusFilter,
            departmentId,
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
    "WORKDAY",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Workday connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const tenant = config?.tenant as string | undefined;
      const host = config?.host as string | undefined;
      if (!(tenant && host)) {
        throw ApplicationFailure.nonRetryable(
          `No tenant or host for Workday connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncOrganizations =
        parseBooleanConfig(config?.sync_organizations) !== false;
      const syncTerminated =
        parseBooleanConfig(config?.sync_terminated) === true;

      const client = createWorkdayClient({
        connectorId,
        accessToken,
        tenant,
        host,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        tenant,
        host,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? workdayFullSync(client, context, {
            syncTerminated,
            syncOrganizations,
          })
        : workdayIncrementalSync(client, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            syncTerminated,
            syncOrganizations,
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
    "DOCUSIGN",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const accountId = (config?.accountId as string) ?? "";
      const baseUri = (config?.baseUri as string) ?? "";
      const syncTemplates =
        parseBooleanConfig(config?.sync_templates) !== false;
      const syncFolders = parseBooleanConfig(config?.sync_folders) !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 365);
      const envelopeStatusFilterStr =
        (config?.envelope_status_filter as string) ?? "";
      const envelopeStatusFilter = envelopeStatusFilterStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!(accountId && baseUri)) {
        throw ApplicationFailure.nonRetryable(
          "DocuSign accountId or baseUri not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, accountId }, "DocuSign sync config loaded");

      const client = createDocuSignClient({
        connectorId,
        accessToken,
        accountId,
        baseUri,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        accountBaseUri: baseUri,
        accountId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? docuSignFullSync(client, context, {
            batchSize: 100,
            syncTemplates,
            syncFolders,
            envelopeStatusFilter,
            lookbackDays,
          })
        : docuSignIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            syncTemplates,
            syncFolders,
            envelopeStatusFilter,
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
    "FIFTEEN_FIVE",
    async function* (connectorId, connector, cursor, syncType) {
      const ffConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (ffConfig?.apiKey as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No credentials for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createFifteenFiveClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? fifteenFiveFullSync(client, context, { batchSize: 100 })
        : fifteenFiveIncrementalSync(client, context, {
            cursor: cursor as
              | { lastSyncTime?: number; forceFullSync?: boolean }
              | undefined,
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
    "HARVEST",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No credentials for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const harvestConfig = connector.config as Record<string, unknown> | null;
      const accountId = (harvestConfig?.accountId as string) ?? "";
      if (!accountId) {
        throw ApplicationFailure.nonRetryable(
          "Harvest accountId not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createHarvestClient({
        connectorId,
        accessToken,
        accountId,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        accountId,
        baseUrl: "https://api.harvestapp.com/v2",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? harvestFullSync(client, context, { batchSize: 100 })
        : harvestIncrementalSync(client, context, {
            cursor: cursor as
              | { lastSyncTime?: number; forceFullSync?: boolean }
              | undefined,
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
    "FELLOW",
    async function* (connectorId, connector, cursor, syncType) {
      const fellowConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (fellowConfig?.apiKey as string) ?? "";
      const subdomain = (fellowConfig?.subdomain as string) ?? "";
      if (!(apiKey && subdomain)) {
        throw ApplicationFailure.nonRetryable(
          `Missing credentials or subdomain for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createFellowClient({ connectorId, apiKey, subdomain });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? fellowFullSync(client, context, { batchSize: 100 })
        : fellowIncrementalSync(client, context, {
            cursor: cursor as
              | { lastSyncTime?: number; lastFullSync?: number }
              | undefined,
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
