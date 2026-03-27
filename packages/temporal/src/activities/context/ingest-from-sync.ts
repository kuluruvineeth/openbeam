import type { Database } from "@openbeam/db";
import { findContextEntry, upsertContextEntry } from "@openbeam/db";
import { generateEntryId, getParentUri } from "@openbeam/services/context/uri";
import { IngestSyncBatchInputSchema } from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { IngestSyncBatchOutput } from "./types";

export interface IngestFromSyncDependencies {
  db: Database;
}

export function createIngestFromSyncActivity(deps: IngestFromSyncDependencies) {
  return {
    async ingestSyncBatchToContext(
      rawInput: unknown
    ): Promise<IngestSyncBatchOutput> {
      const input = IngestSyncBatchInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "loading-documents",
        teamId: input.teamId,
        connectorId: input.connectorId,
        documentCount: input.documentIds.length,
      });

      const documents = await deps.db.indexedDocument.findMany({
        where: { id: { in: input.documentIds } },
      });

      let created = 0;
      let updated = 0;

      for (let i = 0; i < documents.length; i += 1) {
        const doc = documents[i];
        if (!doc) {
          continue;
        }

        if (i > 0 && i % 50 === 0) {
          Context.current().heartbeat({
            stage: "ingesting",
            progress: i,
            total: documents.length,
          });
        }

        const uri = `openbeam://resources/${input.teamId}/connectors/${input.connectorId}/${doc.documentType}/${doc.externalId}`;
        const id = generateEntryId(input.teamId, uri);
        const parentUri = getParentUri(uri);
        const abstractText = doc.title
          ? doc.title.slice(0, 200)
          : `${doc.documentType}/${doc.externalId}`;

        const existing = await findContextEntry(deps.db, input.teamId, uri);
        const isUpdate = existing !== null;

        await upsertContextEntry(deps.db, {
          id,
          uri,
          parentUri: parentUri ?? undefined,
          teamId: input.teamId,
          ownerId: input.teamId,
          ownerType: "team",
          contextType: "resource",
          category: doc.documentType,
          isLeaf: true,
          abstractText,
          content: doc.title ?? undefined,
        });

        if (isUpdate) {
          updated += 1;
        } else {
          created += 1;
        }
      }

      return { created, updated };
    },
  };
}
