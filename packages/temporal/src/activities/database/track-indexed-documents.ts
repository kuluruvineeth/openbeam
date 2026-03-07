import type { Database } from "@openbeam/db";
import {
  createDocumentChanges,
  findIndexedDocumentsByExternalIds,
  updateSyncHistoryCounts,
  upsertIndexedDocumentsBatch,
} from "@openbeam/db";
import type {
  TrackIndexedDocumentsInput,
  TrackIndexedDocumentsResult,
} from "./types";

export function createTrackIndexedDocumentsActivity(deps: { db: Database }) {
  return async function trackIndexedDocuments(
    input: TrackIndexedDocumentsInput
  ): Promise<TrackIndexedDocumentsResult> {
    if (input.documents.length === 0) {
      return { tracked: 0, dataAdded: 0, dataUpdated: 0 };
    }

    const externalIds = input.documents.map((doc) => doc.external_id);
    const existingDocs = await findIndexedDocumentsByExternalIds(
      deps.db,
      input.connectorId,
      externalIds
    );

    let dataAdded = 0;
    let dataUpdated = 0;
    const createdVespaIds: string[] = [];
    const updatedVespaIds: string[] = [];

    const documentsToUpsert = input.documents.map((doc) => {
      const existing = existingDocs.get(doc.external_id);
      const newChecksum = doc.checksum ?? "";

      if (!existing) {
        dataAdded += 1;
        createdVespaIds.push(doc.id);
      } else if (existing.checksum !== newChecksum) {
        dataUpdated += 1;
        updatedVespaIds.push(doc.id);
      }

      return {
        connectorId: input.connectorId,
        externalId: doc.external_id,
        vespaId: doc.id,
        documentType: doc.document_type,
        documentSubtype: doc.document_subtype ?? null,
        sourceId: doc.source_id ?? null,
        title: doc.title ?? null,
        checksum: newChecksum,
        lastChecksum: existing?.checksum ?? null,
        metadata: doc.metadata ?? null,
      };
    });

    const upserted = await upsertIndexedDocumentsBatch(
      deps.db,
      documentsToUpsert
    );

    if (input.syncHistoryId && (dataAdded > 0 || dataUpdated > 0)) {
      await updateSyncHistoryCounts(
        deps.db,
        input.syncHistoryId,
        dataAdded,
        dataUpdated
      );
    }

    if (createdVespaIds.length > 0 || updatedVespaIds.length > 0) {
      const connector = await deps.db.connector.findUniqueOrThrow({
        where: { id: input.connectorId },
        select: { teamId: true },
      });

      const changes: Array<{
        documentId: string;
        changeType: "CREATED" | "UPDATED";
        source: "CONNECTOR_SYNC";
        metadata?: { syncHistoryId: string };
      }> = [];

      for (const vespaId of createdVespaIds) {
        changes.push({
          documentId: vespaId,
          changeType: "CREATED",
          source: "CONNECTOR_SYNC",
          ...(input.syncHistoryId && {
            metadata: { syncHistoryId: input.syncHistoryId },
          }),
        });
      }

      for (const vespaId of updatedVespaIds) {
        changes.push({
          documentId: vespaId,
          changeType: "UPDATED",
          source: "CONNECTOR_SYNC",
          ...(input.syncHistoryId && {
            metadata: { syncHistoryId: input.syncHistoryId },
          }),
        });
      }

      await createDocumentChanges(deps.db, {
        teamId: connector.teamId,
        connectorId: input.connectorId,
        changes,
      });
    }

    return { tracked: upserted, dataAdded, dataUpdated };
  };
}
