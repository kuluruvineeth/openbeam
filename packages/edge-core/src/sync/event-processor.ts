import type { Database } from "bun:sqlite";
import type { SyncEvent } from "@openbeam/types/edge/sync";

interface ProcessResult {
  processed: number;
  skipped: number;
  errors: string[];
}

interface EventRow {
  id: string;
  type: string;
  document_id: string;
  connector_id: string;
  timestamp: number;
  payload: string | null;
  checksum: string | null;
  size_bytes: number;
  processed_at: number | null;
}

const SYNC_EVENTS_DDL = `
  CREATE TABLE IF NOT EXISTS sync_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    document_id TEXT NOT NULL,
    connector_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    payload TEXT,
    checksum TEXT,
    size_bytes INTEGER DEFAULT 0,
    processed_at INTEGER
  )
`;

export class SyncEventProcessor {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    this.db.exec(SYNC_EVENTS_DDL);
  }

  processBatch(events: SyncEvent[]): ProcessResult {
    let processed = 0;
    const skipped = 0;
    const errors: string[] = [];

    const upsertStmt = this.db.query(
      `INSERT OR REPLACE INTO sync_events (id, type, document_id, connector_id, timestamp, payload, checksum, size_bytes, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const deleteStmt = this.db.query(
      "DELETE FROM sync_events WHERE document_id = ? AND connector_id = ?"
    );

    for (const event of events) {
      try {
        if (event.type === "delete") {
          deleteStmt.run(event.documentId, event.connectorId);
        } else {
          upsertStmt.run(
            event.id,
            event.type,
            event.documentId,
            event.connectorId,
            event.timestamp,
            event.payload ? JSON.stringify(event.payload) : null,
            event.checksum ?? null,
            event.sizeBytes ?? 0,
            Date.now()
          );
        }
        processed += 1;
      } catch (err) {
        errors.push(
          `Event ${event.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return { processed, skipped, errors };
  }

  getEventsByConnector(connectorId: string, limit = 100): SyncEvent[] {
    const rows = this.db
      .query<EventRow, [string, number]>(
        "SELECT * FROM sync_events WHERE connector_id = ? ORDER BY timestamp DESC LIMIT ?"
      )
      .all(connectorId, limit);

    return rows.map(rowToSyncEvent);
  }

  getEventsSince(timestamp: number, limit = 100): SyncEvent[] {
    const rows = this.db
      .query<EventRow, [number, number]>(
        "SELECT * FROM sync_events WHERE timestamp >= ? ORDER BY timestamp ASC LIMIT ?"
      )
      .all(timestamp, limit);

    return rows.map(rowToSyncEvent);
  }

  deleteProcessedEvents(beforeTimestamp: number): number {
    const result = this.db
      .query(
        "DELETE FROM sync_events WHERE processed_at IS NOT NULL AND processed_at < ?"
      )
      .run(beforeTimestamp);
    return result.changes;
  }
}

function rowToSyncEvent(row: EventRow): SyncEvent {
  return {
    id: row.id,
    type: row.type as SyncEvent["type"],
    documentId: row.document_id,
    connectorId: row.connector_id,
    timestamp: row.timestamp,
    payload: row.payload ? JSON.parse(row.payload) : undefined,
    checksum: row.checksum ?? undefined,
    sizeBytes: row.size_bytes,
  };
}
