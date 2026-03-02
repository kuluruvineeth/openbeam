import type { Database } from "@openplane/db";
import { createDocumentChanges } from "@openplane/db";
import type { RecordSyncDocumentChangesInput } from "./types";

export function createRecordSyncDocumentChangesActivity(deps: {
  db: Database;
}) {
  return async function recordSyncDocumentChanges(
    input: RecordSyncDocumentChangesInput
  ): Promise<{ recorded: number }> {
    if (input.documentIds.length === 0) {
      return { recorded: 0 };
    }

    const connector = await deps.db.connector.findUniqueOrThrow({
      where: { id: input.connectorId },
      select: { teamId: true },
    });

    const result = await createDocumentChanges(deps.db, {
      teamId: connector.teamId,
      connectorId: input.connectorId,
      changes: input.documentIds.map((documentId) => ({
        documentId,
        changeType: input.changeType,
        source: "CONNECTOR_SYNC" as const,
        metadata: input.syncHistoryId
          ? { syncHistoryId: input.syncHistoryId }
          : undefined,
      })),
    });

    return { recorded: result.count };
  };
}
