import type { Database } from "@openbeam/db";
import { createContextRelation, findContextEntry } from "@openbeam/db";
import { ExtractRelationsInputSchema } from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { ExtractRelationsOutput } from "./types";

export interface ExtractRelationsDependencies {
  db: Database;
}

const RELATION_METADATA_KEYS = [
  "related_doc_ids",
  "referenced_doc_ids",
] as const;

export function createExtractRelationsActivity(
  deps: ExtractRelationsDependencies
) {
  return {
    async extractRelationsFromDocuments(
      rawInput: unknown
    ): Promise<ExtractRelationsOutput> {
      const input = ExtractRelationsInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "loading-documents",
        teamId: input.teamId,
        documentCount: input.documentIds.length,
      });

      const documents = await deps.db.indexedDocument.findMany({
        where: { id: { in: input.documentIds } },
      });

      let relationsCreated = 0;

      for (let i = 0; i < documents.length; i += 1) {
        const doc = documents[i];
        if (!doc) {
          continue;
        }

        if (i > 0 && i % 50 === 0) {
          Context.current().heartbeat({
            stage: "extracting-relations",
            progress: i,
            total: documents.length,
          });
        }

        const sourceUri = `openbeam://resources/${input.teamId}/connectors/${input.connectorId}/${doc.documentType}/${doc.externalId}`;
        const metadata = doc.metadata as Record<string, unknown> | null;
        if (!metadata) {
          continue;
        }

        const referencedIds: string[] = [];

        for (const key of RELATION_METADATA_KEYS) {
          const value = metadata[key];
          if (Array.isArray(value)) {
            for (const id of value) {
              if (typeof id === "string") {
                referencedIds.push(id);
              }
            }
          }
        }

        const parentId = metadata.parent_id;
        if (typeof parentId === "string") {
          referencedIds.push(parentId);
        }

        for (const refExternalId of referencedIds) {
          const refDoc = await deps.db.indexedDocument.findFirst({
            where: {
              connectorId: input.connectorId,
              externalId: refExternalId,
            },
            select: { documentType: true, externalId: true },
          });

          if (!refDoc) {
            continue;
          }

          const targetUri = `openbeam://resources/${input.teamId}/connectors/${input.connectorId}/${refDoc.documentType}/${refDoc.externalId}`;

          const sourceExists = await findContextEntry(
            deps.db,
            input.teamId,
            sourceUri
          );
          const targetExists = await findContextEntry(
            deps.db,
            input.teamId,
            targetUri
          );

          if (!(sourceExists && targetExists)) {
            continue;
          }

          const created = await createContextRelation(deps.db, {
            sourceUri,
            targetUri,
            teamId: input.teamId,
            reason:
              typeof parentId === "string" && refExternalId === parentId
                ? "parent"
                : "reference",
          }).catch(() => null);
          if (created) {
            relationsCreated += 1;
          }
        }
      }

      return { relationsCreated };
    },
  };
}
