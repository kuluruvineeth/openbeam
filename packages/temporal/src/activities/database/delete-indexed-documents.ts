import type { Database } from "@openbeam/db";
import { deleteIndexedDocumentByExternalId } from "@openbeam/db";
import type {
  DeleteIndexedDocumentsInput,
  DeleteIndexedDocumentsResult,
} from "./types";

export function createDeleteIndexedDocumentsActivity(deps: { db: Database }) {
  return async function deleteIndexedDocuments(
    input: DeleteIndexedDocumentsInput
  ): Promise<DeleteIndexedDocumentsResult> {
    if (input.externalIds.length === 0) {
      return { deleted: 0 };
    }

    const uniqueExternalIds = Array.from(new Set(input.externalIds));
    const deleteResults = await Promise.all(
      uniqueExternalIds.map((externalId) =>
        deleteIndexedDocumentByExternalId(
          deps.db,
          input.connectorId,
          externalId
        )
      )
    );
    const deleted = deleteResults.reduce(
      (sum, result) => sum + result.count,
      0
    );

    return { deleted };
  };
}
