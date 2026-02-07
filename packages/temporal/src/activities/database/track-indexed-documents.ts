import type { Database } from "@openplane/db";
import {
  findIndexedDocumentsByExternalIds,
  updateSyncHistoryCounts,
  upsertIndexedDocumentsBatch,
} from "@openplane/db";
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

    const documentsToUpsert = input.documents.map((doc) => {
      const existing = existingDocs.get(doc.external_id);
      const newChecksum = doc.checksum ?? "";

      if (!existing) {
        dataAdded += 1;
      } else if (existing.checksum !== newChecksum) {
        dataUpdated += 1;
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

    return { tracked: upserted, dataAdded, dataUpdated };
  };
}
