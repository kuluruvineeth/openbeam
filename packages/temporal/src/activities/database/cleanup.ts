import type { Database } from "@openplane/db";
import {
  deleteConnectorWithCleanup,
  deleteStaleIndexedDocuments,
} from "@openplane/db";
import type { CleanupActivities } from "./types";

export interface CleanupDeps {
  db: Database;
}

export function createCleanupActivities(deps: CleanupDeps): CleanupActivities {
  const { db } = deps;

  return {
    async removeStaleDocuments(input: {
      connectorId: string;
      olderThanMs: number;
    }): Promise<{ deleted: number }> {
      const cutoff = new Date(Date.now() - input.olderThanMs);
      const result = await deleteStaleIndexedDocuments(
        db,
        input.connectorId,
        cutoff
      );
      return { deleted: result.count };
    },

    async deleteConnectorRecord(input: { connectorId: string }): Promise<void> {
      await deleteConnectorWithCleanup(db, input.connectorId);
    },
  };
}
