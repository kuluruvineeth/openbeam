import type { Database } from "@openbeam/db";
import { getSyncCursor, upsertSyncCursor } from "@openbeam/db";
import type { GetSyncCursorResult } from "./types";

export const DEFAULT_SYNC_RESOURCE = "messages";

export async function getSyncCursorForConnector(
  db: Database,
  connectorId: string,
  type: "FULL" | "INCREMENTAL" | "PERMISSIONS",
  resource: string = DEFAULT_SYNC_RESOURCE
): Promise<GetSyncCursorResult> {
  if (type === "FULL" || type === "PERMISSIONS") {
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
