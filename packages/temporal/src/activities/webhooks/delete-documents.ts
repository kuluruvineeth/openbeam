import type { VespaClient } from "@openbeam/vespa";
import type { DeleteDocumentsInput } from "./types";

export interface DeleteDocumentsDependencies {
  vespa: VespaClient;
}

export function createDeleteDocumentsActivity(
  deps: DeleteDocumentsDependencies
) {
  const { vespa } = deps;

  return async function deleteDocuments(
    input: DeleteDocumentsInput
  ): Promise<void> {
    if (input.documentIds.length === 0) {
      return;
    }

    const batchSize = 50;
    let totalFailed = 0;

    for (let i = 0; i < input.documentIds.length; i += batchSize) {
      const batch = input.documentIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((id) => vespa.deleteDocument(id))
      );

      for (const result of results) {
        if (result.status === "rejected") {
          totalFailed += 1;
        }
      }
    }

    if (totalFailed > 0) {
      throw new Error(
        `Failed to delete ${totalFailed} of ${input.documentIds.length} documents`
      );
    }
  };
}
