import type { VespaClient } from "@openplane/vespa";
import type { DeleteDocumentsInput } from "./types";

export function createDeleteDocumentsActivity(vespa: VespaClient) {
  return async function deleteDocuments(
    input: DeleteDocumentsInput
  ): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    const batchSize = 50;
    for (let i = 0; i < input.documentIds.length; i += batchSize) {
      const batch = input.documentIds.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((id) => vespa.deleteDocument(id))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          deleted += 1;
        } else {
          failed += 1;
        }
      }
    }

    return { deleted, failed };
  };
}
