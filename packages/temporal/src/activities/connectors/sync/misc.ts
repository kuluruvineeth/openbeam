import {
  ahaFullSync,
  ahaIncrementalSync,
  benchlingFullSync,
  benchlingIncrementalSync,
  bynderFullSync,
  bynderIncrementalSync,
  coupaFullSync,
  coupaIncrementalSync,
  createAhaClient,
  createBenchlingClient,
  createBynderClient,
  createCoupaClient,
  createDynamics365Client,
  createEvernoteClient,
  createIroncladClient,
  createLoopioClient,
  createNetsuiteClient,
  createPanoptoClient,
  createProcoreClient,
  createZoomClient,
  dynamics365FullSync,
  dynamics365IncrementalSync,
  evernoteFullSync,
  evernoteIncrementalSync,
  executePullSync,
  getValidAccessToken,
  ironcladFullSync,
  ironcladIncrementalSync,
  loopioFullSync,
  loopioIncrementalSync,
  netsuiteFullSync,
  netsuiteIncrementalSync,
  panoptoFullSync,
  panoptoIncrementalSync,
  procoreFullSync,
  procoreIncrementalSync,
  zoomFullSync,
  zoomIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { AhaSyncCursor } from "@openbeam/types/services/connectors/aha";
import type { BenchlingSyncCursor } from "@openbeam/types/services/connectors/benchling";
import type { BynderSyncCursor } from "@openbeam/types/services/connectors/bynder";
import type { CoupaSyncCursor } from "@openbeam/types/services/connectors/coupa";
import {
  type CustomPullSyncCursor,
  PullConnectorDefinitionSchema,
} from "@openbeam/types/services/connectors/custom-pull";
import type { EvernoteSyncCursor } from "@openbeam/types/services/connectors/evernote";
import type { IroncladSyncCursor } from "@openbeam/types/services/connectors/ironclad";
import type { LoopioSyncCursor } from "@openbeam/types/services/connectors/loopio";
import type { NetsuiteSyncCursor } from "@openbeam/types/services/connectors/netsuite";
import type { PanoptoSyncCursor } from "@openbeam/types/services/connectors/panopto";
import type { ProcoreSyncCursor } from "@openbeam/types/services/connectors/procore";
import type { ZoomSyncCursor } from "@openbeam/types/services/connectors/zoom";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseNumericConfig, shouldRunFullSync } from "./helpers";

export function registerMiscFactories(): void {
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
    "DYNAMICS_365",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const orgUrl = (config?.org_url as string) ?? "";
      const syncLeads = config?.sync_leads !== false;
      const syncCases = config?.sync_cases !== false;
      const syncActivities = config?.sync_activities !== false;

      if (!orgUrl) {
        throw ApplicationFailure.nonRetryable(
          "Dynamics 365 org_url not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, orgUrl }, "Dynamics 365 sync config loaded");

      const client = createDynamics365Client({
        connectorId,
        accessToken,
        orgUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        orgUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? dynamics365FullSync(client, context, {
            batchSize: 100,
            syncLeads,
            syncCases,
            syncActivities,
          })
        : dynamics365IncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            syncLeads,
            syncCases,
            syncActivities,
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
    "CUSTOM",
    async function* (connectorId, connector, cursor) {
      const config = connector.config as Record<string, unknown> | null;
      const pullConfigRaw = config?.pullConfig;

      if (!pullConfigRaw) {
        throw ApplicationFailure.nonRetryable(
          `No pull config found for custom connector ${connectorId}`,
          "ConfigError"
        );
      }

      const parsed = PullConnectorDefinitionSchema.safeParse(pullConfigRaw);
      if (!parsed.success) {
        throw ApplicationFailure.nonRetryable(
          `Invalid pull config for custom connector ${connectorId}: ${parsed.error.message}`,
          "ConfigError"
        );
      }

      const pullDefinition = parsed.data;
      const slug = (config?.slug as string) ?? connectorId;

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        slug,
      };

      const pullCursor: CustomPullSyncCursor = {
        lastSyncTime: parseNumericConfig(cursor?.lastSyncTime),
        lastFullSync: parseNumericConfig(cursor?.lastFullSync),
        endpointCursors:
          (cursor?.endpointCursors as Record<
            string,
            Record<string, unknown>
          >) ?? {},
      };

      for await (const batch of executePullSync(
        pullDefinition,
        context,
        pullCursor
      )) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "AHA",
    async function* (connectorId, connector, cursor, syncType) {
      const ahaConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (ahaConfig?.apiKey as string) ?? "";
      const subdomain = (ahaConfig?.subdomain as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!subdomain) {
        throw ApplicationFailure.nonRetryable(
          "Aha subdomain not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createAhaClient({ connectorId, apiKey, subdomain });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        subdomain,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? ahaFullSync(client, context, { batchSize: 100 })
        : ahaIncrementalSync(client, context, {
            cursor: cursor as AhaSyncCursor,
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
    "BENCHLING",
    async function* (connectorId, connector, cursor, syncType) {
      const benchConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (benchConfig?.apiKey as string) ?? "";
      const tenant = (benchConfig?.tenant as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!tenant) {
        throw ApplicationFailure.nonRetryable(
          "Benchling tenant not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createBenchlingClient({ connectorId, apiKey, tenant });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        tenant,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? benchlingFullSync(client, context, { batchSize: 100 })
        : benchlingIncrementalSync(client, context, {
            cursor: cursor as BenchlingSyncCursor,
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
    "BYNDER",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const bynderConfig = connector.config as Record<string, unknown> | null;
      const domain = (bynderConfig?.domain as string) ?? "";
      if (!domain) {
        throw ApplicationFailure.nonRetryable(
          "Bynder domain not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createBynderClient({ connectorId, accessToken, domain });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        domain,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? bynderFullSync(client, context, { batchSize: 100 })
        : bynderIncrementalSync(client, context, {
            cursor: cursor as BynderSyncCursor,
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
    "COUPA",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const coupaConfig = connector.config as Record<string, unknown> | null;
      const coupaInstanceUrl = (coupaConfig?.instanceUrl as string) ?? "";
      if (!coupaInstanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Coupa instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createCoupaClient({
        connectorId,
        accessToken,
        instanceUrl: coupaInstanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: coupaInstanceUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? coupaFullSync(client, context, { batchSize: 100 })
        : coupaIncrementalSync(client, context, {
            cursor: cursor as CoupaSyncCursor,
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
    "EVERNOTE",
    async function* (connectorId, connector, cursor, syncType) {
      const evernoteConfig = connector.config as Record<string, unknown> | null;
      const developerToken = (evernoteConfig?.developerToken as string) ?? "";
      const environment =
        (evernoteConfig?.environment as "production" | "sandbox") ??
        "production";
      if (!developerToken) {
        throw ApplicationFailure.nonRetryable(
          `No developer token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createEvernoteClient({
        connectorId,
        developerToken,
        environment,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? evernoteFullSync(client, context, { batchSize: 100 })
        : evernoteIncrementalSync(client, context, {
            cursor: cursor as EvernoteSyncCursor,
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
    "IRONCLAD",
    async function* (connectorId, connector, cursor, syncType) {
      const ironcladConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (ironcladConfig?.apiKey as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createIroncladClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? ironcladFullSync(client, context, { batchSize: 100 })
        : ironcladIncrementalSync(client, context, {
            cursor: cursor as IroncladSyncCursor,
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
    "LOOPIO",
    async function* (connectorId, connector, cursor, syncType) {
      const loopioConfig = connector.config as Record<string, unknown> | null;
      const accessToken = (loopioConfig?.apiKey as string) ?? "";
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createLoopioClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? loopioFullSync(client, context, { batchSize: 100 })
        : loopioIncrementalSync(client, context, {
            cursor: cursor as LoopioSyncCursor,
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
    "NETSUITE",
    async function* (connectorId, connector, cursor, syncType) {
      const nsConfig = connector.config as Record<string, unknown> | null;
      const accountId = (nsConfig?.accountId as string) ?? "";
      const consumerKey = (nsConfig?.consumerKey as string) ?? "";
      const consumerSecret = (nsConfig?.consumerSecret as string) ?? "";
      const tokenKey = (nsConfig?.tokenKey as string) ?? "";
      const tokenSecret = (nsConfig?.tokenSecret as string) ?? "";
      if (!accountId) {
        throw ApplicationFailure.nonRetryable(
          "NetSuite accountId not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createNetsuiteClient({
        connectorId,
        accountId,
        consumerKey,
        consumerSecret,
        tokenKey,
        tokenSecret,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        accountId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? netsuiteFullSync(client, context, { batchSize: 100 })
        : netsuiteIncrementalSync(client, context, {
            cursor: cursor as NetsuiteSyncCursor,
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
    "PANOPTO",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const panoptoConfig = connector.config as Record<string, unknown> | null;
      const panoptoInstanceUrl = (panoptoConfig?.instanceUrl as string) ?? "";
      if (!panoptoInstanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Panopto instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createPanoptoClient({
        connectorId,
        accessToken,
        instanceUrl: panoptoInstanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: panoptoInstanceUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? panoptoFullSync(client, context, { batchSize: 100 })
        : panoptoIncrementalSync(client, context, {
            cursor: cursor as PanoptoSyncCursor,
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
    "PROCORE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const procoreConfig = connector.config as Record<string, unknown> | null;
      const companyId = (procoreConfig?.companyId as string) ?? "";
      if (!companyId) {
        throw ApplicationFailure.nonRetryable(
          "Procore companyId not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createProcoreClient({
        connectorId,
        accessToken,
        companyId,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        companyId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? procoreFullSync(client, context, { batchSize: 100 })
        : procoreIncrementalSync(client, context, {
            cursor: cursor as ProcoreSyncCursor,
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
