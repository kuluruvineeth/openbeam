import {
  amplitudeFullSync,
  amplitudeIncrementalSync,
  createAmplitudeClient,
  createGongClient,
  createHighspotClient,
  createKlueClient,
  createMarketoClient,
  createSeismicClient,
  createShowpadClient,
  getValidAccessToken,
  gongFullSync,
  gongIncrementalSync,
  highspotFullSync,
  highspotIncrementalSync,
  klueFullSync,
  klueIncrementalSync,
  marketoFullSync,
  marketoIncrementalSync,
  seismicFullSync,
  seismicIncrementalSync,
  showpadFullSync,
  showpadIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { AmplitudeSyncCursor } from "@openbeam/types/services/connectors/amplitude";
import type { KlueSyncCursor } from "@openbeam/types/services/connectors/klue";
import type { SeismicSyncCursor } from "@openbeam/types/services/connectors/seismic";
import type { ShowpadSyncCursor } from "@openbeam/types/services/connectors/showpad";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import {
  parseBooleanConfig,
  parseNumericConfig,
  shouldRunFullSync,
} from "./helpers";

export function registerMarketingFactories(): void {
  registerSyncFactory(
    "MARKETO",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const munchkinId =
        (config?.munchkinId as string) ?? (config?.munchkin_id as string) ?? "";
      const syncActivities =
        parseBooleanConfig(config?.sync_activities) !== false;
      const syncCampaigns =
        parseBooleanConfig(config?.sync_campaigns) !== false;
      const syncPrograms = parseBooleanConfig(config?.sync_programs) !== false;
      const syncEmails = parseBooleanConfig(config?.sync_emails) !== false;
      const syncLandingPages =
        parseBooleanConfig(config?.sync_landing_pages) !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);

      if (!munchkinId) {
        throw ApplicationFailure.nonRetryable(
          "Marketo munchkinId not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, munchkinId }, "Marketo sync config loaded");

      const client = createMarketoClient({
        connectorId,
        accessToken,
        munchkinId,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        munchkinId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? marketoFullSync(client, context, {
            batchSize: 100,
            syncActivities,
            syncCampaigns,
            syncPrograms,
            syncEmails,
            syncLandingPages,
            lookbackDays,
          })
        : marketoIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            syncActivities,
            syncCampaigns,
            syncPrograms,
            syncEmails,
            syncLandingPages,
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
    "GONG",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const accessKey = config?.access_key as string | undefined;
      const accessKeySecret = config?.access_key_secret as string | undefined;
      if (!(accessKey && accessKeySecret)) {
        throw ApplicationFailure.nonRetryable(
          `Missing Gong API credentials for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncTranscripts = config?.sync_transcripts !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);
      const callDirectionFilter =
        (config?.call_direction_filter as string) ?? "";

      logger.info(
        { connectorId, syncTranscripts, lookbackDays, callDirectionFilter },
        "Gong sync config loaded"
      );

      const client = createGongClient({
        connectorId,
        accessKey,
        accessKeySecret,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        syncTranscripts,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? gongFullSync(client, context, {
            lookbackDays,
            callDirectionFilter,
          })
        : gongIncrementalSync(client, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            callDirectionFilter,
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
    "HIGHSPOT",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const syncPitches = config?.sync_pitches !== false;

      const client = createHighspotClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        domain: (config?.domain as string) ?? "app.highspot.com",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? highspotFullSync(client, context, {
            batchSize: 100,
            syncPitches,
          })
        : highspotIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            syncPitches,
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
    "AMPLITUDE",
    async function* (connectorId, connector, cursor, syncType) {
      const amplitudeConfig = connector.config as Record<
        string,
        unknown
      > | null;
      const apiKey = (amplitudeConfig?.apiKey as string) ?? "";
      const secretKey = (amplitudeConfig?.secretKey as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!secretKey) {
        throw ApplicationFailure.nonRetryable(
          "Amplitude secretKey not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createAmplitudeClient({ connectorId, apiKey, secretKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? amplitudeFullSync(client, context, { batchSize: 100 })
        : amplitudeIncrementalSync(client, context, {
            cursor: cursor as AmplitudeSyncCursor,
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
    "SEISMIC",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createSeismicClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? seismicFullSync(client, context, { batchSize: 100 })
        : seismicIncrementalSync(client, context, {
            cursor: cursor as SeismicSyncCursor,
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
    "SHOWPAD",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const showpadConfig = connector.config as Record<string, unknown> | null;
      const subdomain = (showpadConfig?.subdomain as string) ?? "";
      if (!subdomain) {
        throw ApplicationFailure.nonRetryable(
          "Showpad subdomain not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createShowpadClient({
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

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? showpadFullSync(client, context, { batchSize: 100 })
        : showpadIncrementalSync(client, context, {
            cursor: cursor as ShowpadSyncCursor,
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
    "KLUE",
    async function* (connectorId, connector, cursor, syncType) {
      const klueConfig = connector.config as Record<string, unknown> | null;
      const apiKey = klueConfig?.apiKey as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createKlueClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? klueFullSync(client, context, { batchSize: 100 })
        : klueIncrementalSync(client, context, {
            cursor: cursor as KlueSyncCursor,
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
