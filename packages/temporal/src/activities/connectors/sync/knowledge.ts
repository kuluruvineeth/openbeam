import {
  createDoceboClient,
  createGuruClient,
  createHaystackClient,
  createInsidedClient,
  createInteractClient,
  createLessonlyClient,
  createLumAppsClient,
  createMindtickleClient,
  createMindtouchClient,
  createSimpplrClient,
  doceboFullSync,
  doceboIncrementalSync,
  guruFullSync,
  guruIncrementalSync,
  haystackFullSync,
  haystackIncrementalSync,
  insidedFullSync,
  insidedIncrementalSync,
  interactFullSync,
  interactIncrementalSync,
  lessonlyFullSync,
  lessonlyIncrementalSync,
  lumappsFullSync,
  lumappsIncrementalSync,
  mindtickleFullSync,
  mindtickleIncrementalSync,
  mindtouchFullSync,
  mindtouchIncrementalSync,
  simpplrFullSync,
  simpplrIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { DoceboSyncCursor } from "@openbeam/types/services/connectors/docebo";
import type { HaystackSyncCursor } from "@openbeam/types/services/connectors/haystack";
import type { InsidedSyncCursor } from "@openbeam/types/services/connectors/insided";
import type { InteractSyncCursor } from "@openbeam/types/services/connectors/interact";
import type { LessonlySyncCursor } from "@openbeam/types/services/connectors/lessonly";
import type { LumAppsSyncCursor } from "@openbeam/types/services/connectors/lumapps";
import type { MindtickleSyncCursor } from "@openbeam/types/services/connectors/mindtickle";
import type { MindtouchSyncCursor } from "@openbeam/types/services/connectors/mindtouch";
import type { SimpplrSyncCursor } from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseNumericConfig, shouldRunFullSync } from "./helpers";

export function registerKnowledgeFactories(): void {
  registerSyncFactory(
    "GURU",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const email = config?.email as string | undefined;
      const apiToken = config?.api_token as string | undefined;
      if (!(email && apiToken)) {
        throw ApplicationFailure.nonRetryable(
          `No credentials for Guru connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncCollections = config?.sync_collections !== false;
      const syncFolders = config?.sync_folders !== false;
      const verifiedOnly = config?.verified_only === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 365);
      const includeCollectionsRaw =
        (config?.include_collections as string) ?? "";
      const excludeCollectionsRaw =
        (config?.exclude_collections as string) ?? "";
      const includeCollections = includeCollectionsRaw
        ? includeCollectionsRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;
      const excludeCollections = excludeCollectionsRaw
        ? excludeCollectionsRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;

      logger.info(
        { connectorId, syncCollections, syncFolders, verifiedOnly },
        "Guru sync config loaded"
      );

      const client = createGuruClient({
        connectorId,
        email,
        apiToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? guruFullSync(client, context, {
            batchSize: 100,
            syncCollections,
            syncFolders,
            verifiedOnly,
            lookbackDays,
            includeCollections,
            excludeCollections,
          })
        : guruIncrementalSync(client, context, {
            cursor: {
              lastSyncTime: parseNumericConfig(cursor?.lastSyncTime),
              lastCardModifiedAt: cursor?.lastCardModifiedAt as
                | string
                | undefined,
            },
            verifiedOnly,
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
    "DOCEBO",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const doceboConfig = connector.config as Record<string, unknown> | null;
      const instanceUrl = (doceboConfig?.instanceUrl as string) ?? "";
      if (!instanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Docebo instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createDoceboClient({
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
        ? doceboFullSync(client, context, { batchSize: 100 })
        : doceboIncrementalSync(client, context, {
            cursor: cursor as DoceboSyncCursor,
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
    "LESSONLY",
    async function* (connectorId, connector, cursor, syncType) {
      const lessonlyConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (lessonlyConfig?.apiKey as string) ?? "";
      const subdomain = (lessonlyConfig?.subdomain as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!subdomain) {
        throw ApplicationFailure.nonRetryable(
          "Lessonly subdomain not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createLessonlyClient({ connectorId, apiKey, subdomain });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        subdomain,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? lessonlyFullSync(client, context, { batchSize: 100 })
        : lessonlyIncrementalSync(client, context, {
            cursor: cursor as LessonlySyncCursor,
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
    "MINDTICKLE",
    async function* (connectorId, connector, cursor, syncType) {
      const mindtickleConfig = connector.config as Record<
        string,
        unknown
      > | null;
      const apiKey = (mindtickleConfig?.apiKey as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createMindtickleClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? mindtickleFullSync(client, context, { batchSize: 100 })
        : mindtickleIncrementalSync(client, context, {
            cursor: cursor as MindtickleSyncCursor,
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
    "MINDTOUCH",
    async function* (connectorId, connector, cursor, syncType) {
      const mindtouchConfig = connector.config as Record<
        string,
        unknown
      > | null;
      const apiToken = (mindtouchConfig?.apiToken as string) ?? "";
      const mtInstanceUrl = (mindtouchConfig?.instanceUrl as string) ?? "";
      if (!apiToken) {
        throw ApplicationFailure.nonRetryable(
          `No API token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!mtInstanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Mindtouch instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createMindtouchClient({
        connectorId,
        apiToken,
        instanceUrl: mtInstanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: mtInstanceUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? mindtouchFullSync(client, context, { batchSize: 100 })
        : mindtouchIncrementalSync(client, context, {
            cursor: cursor as MindtouchSyncCursor,
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
    "HAYSTACK",
    async function* (connectorId, connector, cursor, syncType) {
      const haystackConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (haystackConfig?.apiKey as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createHaystackClient({ connectorId, apiKey });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? haystackFullSync(client, context, { batchSize: 100 })
        : haystackIncrementalSync(client, context, {
            cursor: cursor as HaystackSyncCursor,
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
    "SIMPPLR",
    async function* (connectorId, connector, cursor, syncType) {
      const simpplrConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (simpplrConfig?.apiKey as string) ?? "";
      const instance = (simpplrConfig?.instance as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!instance) {
        throw ApplicationFailure.nonRetryable(
          "Simpplr instance not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createSimpplrClient({ connectorId, apiKey, instance });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: `https://${instance}.simpplr.com`,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? simpplrFullSync(client, context, { batchSize: 100 })
        : simpplrIncrementalSync(client, context, {
            cursor: cursor as SimpplrSyncCursor,
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
    "LUMAPPS",
    async function* (connectorId, connector, cursor, syncType) {
      const lumappsConfig = connector.config as Record<string, unknown> | null;
      const apiToken = (lumappsConfig?.apiToken as string) ?? "";
      if (!apiToken) {
        throw ApplicationFailure.nonRetryable(
          `No API token for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createLumAppsClient({
        connectorId,
        apiToken,
        baseUrl: "https://api.lumapps.com/v2",
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? lumappsFullSync(client, context, { batchSize: 100 })
        : lumappsIncrementalSync(client, context, {
            cursor: cursor as LumAppsSyncCursor,
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
    "INSIDED",
    async function* (connectorId, connector, cursor, syncType) {
      const insidedConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (insidedConfig?.apiKey as string) ?? "";
      const communityUrl = (insidedConfig?.communityUrl as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!communityUrl) {
        throw ApplicationFailure.nonRetryable(
          "Insided communityUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createInsidedClient({ connectorId, apiKey, communityUrl });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        communityUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? insidedFullSync(client, context, { batchSize: 100 })
        : insidedIncrementalSync(client, context, {
            cursor: cursor as InsidedSyncCursor,
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
    "INTERACT",
    async function* (connectorId, connector, cursor, syncType) {
      const interactConfig = connector.config as Record<string, unknown> | null;
      const apiKey = (interactConfig?.apiKey as string) ?? "";
      const instance = (interactConfig?.instance as string) ?? "";
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!instance) {
        throw ApplicationFailure.nonRetryable(
          "Interact instance not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createInteractClient({ connectorId, apiKey, instance });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: `https://${instance}.interactsoftware.com`,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? interactFullSync(client, context, { batchSize: 100 })
        : interactIncrementalSync(client, context, {
            cursor: cursor as InteractSyncCursor,
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
