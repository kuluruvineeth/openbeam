import {
  createFhirClient,
  createMatterportClient,
  createOmniverseClient,
  createViamClient,
  fhirFullSync,
  fhirIncrementalSync,
  matterportFullSync,
  matterportIncrementalSync,
  omniverseFullSync,
  omniverseIncrementalSync,
  viamFullSync,
  viamIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseNumericConfig, shouldRunFullSync } from "./helpers";

export function registerPhysicalFactories(): void {
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
}
