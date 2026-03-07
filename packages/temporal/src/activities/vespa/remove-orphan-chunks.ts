import type { GenericDocument, VespaClient } from "@openbeam/vespa";
import type {
  DeleteDocumentsInput,
  RemoveOrphanChunksInput,
  RemoveOrphanChunksResult,
} from "./types";

function buildChunkSelection(connectorId: string): string {
  const base = "openbeam_document.is_chunk==true";
  if (!connectorId) {
    return base;
  }
  return `${base} and openbeam_document.connector_id=="${connectorId}"`;
}

async function checkOrphanStatus(
  vespa: VespaClient,
  doc: GenericDocument,
  parentIds: Set<string>
): Promise<{ isOrphan: boolean; parentChecked: boolean }> {
  if (!doc.parent_doc_id) {
    return { isOrphan: false, parentChecked: false };
  }

  if (parentIds.has(doc.parent_doc_id)) {
    return { isOrphan: false, parentChecked: false };
  }

  const parentExists = await vespa.getDocument(doc.parent_doc_id);
  if (parentExists) {
    parentIds.add(doc.parent_doc_id);
    return { isOrphan: false, parentChecked: true };
  }

  return { isOrphan: true, parentChecked: true };
}

export function createRemoveOrphanChunksActivity(
  vespa: VespaClient,
  deleteDocuments: (
    input: DeleteDocumentsInput
  ) => Promise<{ deleted: number; failed: number }>
) {
  return async function removeOrphanChunks(
    input: RemoveOrphanChunksInput
  ): Promise<RemoveOrphanChunksResult> {
    let scanned = 0;
    let removed = 0;
    const parentIds = new Set<string>();
    const orphanIds: string[] = [];
    const BATCH_DELETE_THRESHOLD = 100;

    const documentIterator = vespa.visitDocuments<GenericDocument>({
      schema: "openbeam_document",
      selection: buildChunkSelection(input.connectorId),
      fieldSet: "openbeam_document:id,parent_doc_id",
      wantedDocumentCount: 1000,
    });

    for await (const batch of documentIterator) {
      for (const doc of batch) {
        scanned += 1;
        const { isOrphan } = await checkOrphanStatus(vespa, doc, parentIds);
        if (isOrphan) {
          orphanIds.push(doc.id);
        }
      }

      if (orphanIds.length >= BATCH_DELETE_THRESHOLD) {
        const toDelete = orphanIds.splice(0, BATCH_DELETE_THRESHOLD);
        const deleteResult = await deleteDocuments({
          connectorId: input.connectorId,
          documentIds: toDelete,
        });
        removed += deleteResult.deleted;
      }
    }

    if (orphanIds.length > 0) {
      const deleteResult = await deleteDocuments({
        connectorId: input.connectorId,
        documentIds: orphanIds,
      });
      removed += deleteResult.deleted;
    }

    return { removed, scanned };
  };
}
