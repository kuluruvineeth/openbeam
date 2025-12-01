import type { Database } from "@openplane/db";
import { getSyncCursor, upsertSyncCursor } from "@openplane/db";
import type { GetSyncCursorResult } from "./types";

export const DEFAULT_SYNC_RESOURCE = "messages";

export async function getSyncCursorForConnector(
  db: Database,
  connectorId: string,
  type: "FULL" | "INCREMENTAL",
  resource: string = DEFAULT_SYNC_RESOURCE
): Promise<GetSyncCursorResult> {
  if (type === "FULL") {
    return { cursor: undefined, lastSyncedAt: null };
  }

  const syncCursor = await getSyncCursor(db, connectorId, resource);

  return {
    cursor: syncCursor?.cursor ?? undefined,
    lastSyncedAt: syncCursor?.lastSyncedAt ?? null,
  };
}

export async function updateSyncCursor(
  db: Database,
  connectorId: string,
  cursor: string,
  resource: string = DEFAULT_SYNC_RESOURCE
): Promise<void> {
  await upsertSyncCursor(db, {
    connectorId,
    resource,
    cursor,
  });
}
