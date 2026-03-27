import {
  boxFullSync,
  boxIncrementalSync,
  createBoxClient,
  createDropboxClient,
  createEgnyteClient,
  createS3Client,
  dropboxFullSync,
  dropboxIncrementalSync,
  egnyteFullSync,
  egnyteIncrementalSync,
  getValidAccessToken,
  s3FullSync,
  s3IncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseNumericConfig, shouldRunFullSync } from "./helpers";

export function registerStorageFactories(): void {
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
    "EGNYTE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const domain = (config?.domain as string) ?? "";
      const rootFolderPath = (config?.root_folder_path as string) || "/Shared";
      const syncSharedLinks = config?.sync_shared_links !== false;

      logger.info({ connectorId, domain }, "Egnyte sync config loaded");

      const client = createEgnyteClient({ connectorId, accessToken, domain });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        domain,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? egnyteFullSync(client, context, {
            batchSize: 100,
            rootFolderPath,
            syncSharedLinks,
          })
        : egnyteIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            rootFolderPath,
            syncSharedLinks,
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
    "S3",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const accessKeyId = config?.access_key_id as string | undefined;
      const secretAccessKey = config?.secret_access_key as string | undefined;
      const bucketName = config?.bucket_name as string | undefined;
      if (!(accessKeyId && secretAccessKey && bucketName)) {
        throw ApplicationFailure.nonRetryable(
          `Missing AWS credentials or bucket name for S3 connector ${connectorId}`,
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
        | "eu-west-3"
        | "eu-central-1"
        | "eu-north-1"
        | "ap-northeast-1"
        | "ap-northeast-2"
        | "ap-southeast-1"
        | "ap-southeast-2"
        | "ap-south-1"
        | "sa-east-1"
        | "ca-central-1"
        | "me-south-1"
        | "af-south-1";

      const prefixFilter = (config?.prefix_filter as string) ?? "";
      const excludePrefixes = config?.exclude_prefixes
        ? String(config.exclude_prefixes)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : [];
      const fileTypesFilter = config?.file_types_filter
        ? String(config.file_types_filter)
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : [];
      const maxFileSizeMb = parseNumericConfig(config?.max_file_size_mb, 100);
      const lookbackDays = parseNumericConfig(config?.lookback_days, 0);

      const client = createS3Client({
        connectorId,
        accessKeyId,
        secretAccessKey,
        region,
        bucketName,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        region,
        bucketName,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? s3FullSync(client, context, {
            pageSize: 1000,
            prefixFilter,
            excludePrefixes,
            fileTypesFilter,
            maxFileSizeMb,
            lookbackDays,
          })
        : s3IncrementalSync(client, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            pageSize: 1000,
            prefixFilter,
            excludePrefixes,
            fileTypesFilter,
            maxFileSizeMb,
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
