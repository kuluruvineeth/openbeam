import type { Database } from "@openbeam/db";
import {
  deleteConnectorWithCleanup,
  deleteStaleIndexedDocuments,
} from "@openbeam/db";
import type { CleanupActivities } from "./types";

export interface CleanupDeps {
  db: Database;
}

export function createCleanupActivities(deps: CleanupDeps): CleanupActivities {
  const { db } = deps;

  return {
    async removeStaleDocuments(input: {
      teamId: string;
      olderThanMs: number;
    }): Promise<{ deleted: number }> {
      const cutoff = new Date(Date.now() - input.olderThanMs);
      const connectors = await db.connector.findMany({
        where: { teamId: input.teamId },
        select: { id: true },
      });

      let totalDeleted = 0;
      for (const connector of connectors) {
        const result = await deleteStaleIndexedDocuments(
          db,
          connector.id,
          cutoff
        );
        totalDeleted += result.count;
      }
      return { deleted: totalDeleted };
    },

    async getTeamConnectorIds(input: { teamId: string }): Promise<string[]> {
      const connectors = await db.connector.findMany({
        where: { teamId: input.teamId },
        select: { id: true },
      });
      return connectors.map((c) => c.id);
    },

    async deleteConnectorRecord(input: { connectorId: string }): Promise<void> {
      await deleteConnectorWithCleanup(db, input.connectorId);
    },
  };
}
