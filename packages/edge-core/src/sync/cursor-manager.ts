import type { Database } from "bun:sqlite";
import type { EdgeSyncCursor } from "@openbeam/types/edge/sync";

interface CursorRow {
  connector_id: string;
  last_event_id: string | null;
  last_timestamp: number | null;
  merkle_root: string | null;
  full_sync_completed: number;
  version: number;
  updated_at: number;
}

const SYNC_CURSORS_DDL = `
  CREATE TABLE IF NOT EXISTS sync_cursors (
    connector_id TEXT PRIMARY KEY,
    last_event_id TEXT,
    last_timestamp INTEGER,
    merkle_root TEXT,
    full_sync_completed INTEGER DEFAULT 0,
    version INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
  )
`;

export class CursorManager {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    this.db.exec(SYNC_CURSORS_DDL);
  }

  getCursor(connectorId: string): EdgeSyncCursor | null {
    const row = this.db
      .query<CursorRow, [string]>(
        "SELECT * FROM sync_cursors WHERE connector_id = ?"
      )
      .get(connectorId);

    if (!row) {
      return null;
    }

    return rowToCursor(row);
  }

  saveCursor(cursor: EdgeSyncCursor): void {
    this.db
      .query(
        `INSERT OR REPLACE INTO sync_cursors (connector_id, last_event_id, last_timestamp, merkle_root, full_sync_completed, version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        cursor.connectorId,
        cursor.lastEventId ?? null,
        cursor.lastTimestamp ?? null,
        cursor.merkleRoot ?? null,
        cursor.fullSyncCompleted ? 1 : 0,
        cursor.version,
        Date.now()
      );
  }

  deleteCursor(connectorId: string): void {
    this.db
      .query("DELETE FROM sync_cursors WHERE connector_id = ?")
      .run(connectorId);
  }

  isStale(connectorId: string, maxAgeMs: number): boolean {
    const cursor = this.getCursor(connectorId);
    if (!cursor?.lastTimestamp) {
      return true;
    }
    return Date.now() - cursor.lastTimestamp > maxAgeMs;
  }

  listCursors(): EdgeSyncCursor[] {
    const rows = this.db
      .query<CursorRow, []>("SELECT * FROM sync_cursors")
      .all();
    return rows.map(rowToCursor);
  }
}

function rowToCursor(row: CursorRow): EdgeSyncCursor {
  return {
    connectorId: row.connector_id,
    lastEventId: row.last_event_id ?? undefined,
    lastTimestamp: row.last_timestamp ?? undefined,
    merkleRoot: row.merkle_root ?? undefined,
    fullSyncCompleted: row.full_sync_completed === 1,
    version: row.version,
  };
}
