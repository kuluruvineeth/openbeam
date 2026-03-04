import type { Database } from "bun:sqlite";
import type {
  OutboundEvent,
  OutboundEventPriority,
  QueueStats,
} from "@openplane/types/edge/queue";

const PRIORITY_TO_NUMBER: Record<OutboundEventPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const NUMBER_TO_PRIORITY: Record<number, OutboundEventPriority> = {
  0: "critical",
  1: "high",
  2: "normal",
  3: "low",
};

interface EventRow {
  id: string;
  type: string;
  payload: string;
  priority: number;
  status: string;
  attempts: number;
  max_attempts: number;
  size_bytes: number;
  created_at: number;
  scheduled_at: number | null;
  sent_at: number | null;
  expires_at: number | null;
  last_error: string | null;
}

const OUTBOUND_QUEUE_DDL = `
  CREATE TABLE IF NOT EXISTS outbound_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    priority INTEGER DEFAULT 2,
    status TEXT DEFAULT 'queued',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    size_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    scheduled_at INTEGER,
    sent_at INTEGER,
    expires_at INTEGER,
    last_error TEXT
  )
`;

const DEFAULT_MAX_SIZE_MB = 100;
const BYTES_PER_MB = 1024 * 1024;

export class StoreAndForwardQueue {
  private readonly db: Database;
  private readonly maxSizeBytes: number;

  constructor(db: Database, maxSizeMb = DEFAULT_MAX_SIZE_MB) {
    this.db = db;
    this.maxSizeBytes = maxSizeMb * BYTES_PER_MB;
    this.db.exec(OUTBOUND_QUEUE_DDL);
  }

  enqueue(
    type: string,
    payload: Record<string, unknown>,
    priority: OutboundEventPriority = "normal"
  ): string {
    const id = crypto.randomUUID();
    const serialized = JSON.stringify(payload);
    const sizeBytes = new TextEncoder().encode(serialized).byteLength;
    const now = Date.now();

    this.db
      .query(
        `INSERT INTO outbound_queue (id, type, payload, priority, status, attempts, max_attempts, size_bytes, created_at)
         VALUES (?, ?, ?, ?, 'queued', 0, 5, ?, ?)`
      )
      .run(id, type, serialized, PRIORITY_TO_NUMBER[priority], sizeBytes, now);

    return id;
  }

  dequeue(limit = 10): OutboundEvent[] {
    const rows = this.db
      .query<EventRow, [number]>(
        `SELECT * FROM outbound_queue
         WHERE status = 'queued'
         ORDER BY priority ASC, created_at ASC
         LIMIT ?`
      )
      .all(limit);

    return rows.map(rowToOutboundEvent);
  }

  markSent(eventId: string): void {
    const now = Date.now();
    this.db
      .query(
        "UPDATE outbound_queue SET status = 'sent', sent_at = ? WHERE id = ?"
      )
      .run(now, eventId);
  }

  markFailed(eventId: string, error: string): void {
    this.db
      .query(
        `UPDATE outbound_queue
         SET attempts = attempts + 1,
             last_error = ?,
             status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'queued' END
         WHERE id = ?`
      )
      .run(error, eventId);
  }

  getStats(): QueueStats {
    const row = this.db
      .query<
        {
          total: number;
          pending: number;
          failed: number;
          size: number;
          oldest: number | null;
        },
        []
      >(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          COALESCE(SUM(size_bytes), 0) as size,
          MIN(CASE WHEN status = 'queued' THEN created_at ELSE NULL END) as oldest
        FROM outbound_queue`
      )
      .get();

    return {
      totalEvents: row?.total ?? 0,
      pendingEvents: row?.pending ?? 0,
      failedEvents: row?.failed ?? 0,
      totalSizeBytes: row?.size ?? 0,
      maxSizeBytes: this.maxSizeBytes,
      oldestEventAt: row?.oldest ?? undefined,
    };
  }

  evict(): number {
    const now = Date.now();
    let evicted = 0;

    const expiredResult = this.db
      .query(
        "DELETE FROM outbound_queue WHERE expires_at IS NOT NULL AND expires_at <= ?"
      )
      .run(now);
    evicted += expiredResult.changes;

    const currentSize = this.currentSizeBytes();
    if (currentSize > this.maxSizeBytes) {
      const excess = currentSize - this.maxSizeBytes;
      evicted += this.evictLowestPriority(excess);
    }

    return evicted;
  }

  clear(): void {
    this.db.exec("DELETE FROM outbound_queue");
  }

  private currentSizeBytes(): number {
    const row = this.db
      .query<{ total: number }, []>(
        "SELECT COALESCE(SUM(size_bytes), 0) as total FROM outbound_queue WHERE status IN ('queued', 'failed')"
      )
      .get();
    return row?.total ?? 0;
  }

  private evictLowestPriority(bytesToFree: number): number {
    let freed = 0;
    let evicted = 0;

    const rows = this.db
      .query<{ id: string; size_bytes: number }, []>(
        `SELECT id, size_bytes FROM outbound_queue
         WHERE status IN ('queued', 'failed')
         ORDER BY priority DESC, created_at ASC`
      )
      .all();

    for (const row of rows) {
      if (freed >= bytesToFree) {
        break;
      }
      this.db.query("DELETE FROM outbound_queue WHERE id = ?").run(row.id);
      freed += row.size_bytes;
      evicted += 1;
    }

    return evicted;
  }
}

function rowToOutboundEvent(row: EventRow): OutboundEvent {
  return {
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload),
    priority: NUMBER_TO_PRIORITY[row.priority] ?? "normal",
    status: row.status as OutboundEvent["status"],
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    scheduledAt: row.scheduled_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    lastError: row.last_error ?? undefined,
  };
}
