import {
  cisaKevFullSync,
  cisaKevIncrementalSync,
  createNvdClient,
  createOwaspClient,
  mitreAttackFullSync,
  nvdFullSync,
  nvdIncrementalSync,
  owaspFullSync,
} from "@openbeam/services";
import type { GenericDocument } from "@openbeam/vespa";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { shouldRunFullSync } from "./helpers";

export function registerSecurityFactories(): void {
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
          cursor: batch.cursor as SyncCursor,
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
          cursor: batch.cursor as SyncCursor,
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
          cursor: batch.cursor as SyncCursor,
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
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );
}
