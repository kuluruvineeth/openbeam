import type { Database } from "bun:sqlite";

interface CacheOptions {
  tableName?: string;
  maxEntries?: number;
  maxSizeMb?: number;
  defaultTtlMs?: number;
}

interface CacheStats {
  entries: number;
  sizeMb: number;
}

const DEFAULT_MAX_ENTRIES = 10_000;
const DEFAULT_MAX_SIZE_MB = 50;

export class SQLiteCache {
  private readonly db: Database;
  private readonly table: string;
  private readonly maxEntries: number;
  private readonly maxSizeMb: number;
  private readonly defaultTtlMs: number | undefined;

  constructor(db: Database, options: CacheOptions = {}) {
    this.db = db;
    this.table = options.tableName ?? "cache";
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.maxSizeMb = options.maxSizeMb ?? DEFAULT_MAX_SIZE_MB;
    this.defaultTtlMs = options.defaultTtlMs;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        key TEXT PRIMARY KEY,
        value TEXT,
        size_bytes INTEGER NOT NULL,
        expires_at INTEGER,
        last_accessed_at INTEGER NOT NULL
      )
    `);
  }

  get(key: string): string | undefined {
    this.evictExpired();
    const row = this.db
      .query<{ value: string }, [string]>(
        `SELECT value FROM ${this.table} WHERE key = ?`
      )
      .get(key);

    if (!row) {
      return;
    }

    this.db
      .query(`UPDATE ${this.table} SET last_accessed_at = ? WHERE key = ?`)
      .run(Date.now(), key);

    return row.value;
  }

  set(key: string, value: string, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = effectiveTtl ? Date.now() + effectiveTtl : null;
    const sizeBytes = new TextEncoder().encode(value).byteLength;
    const now = Date.now();

    this.db
      .query(
        `INSERT OR REPLACE INTO ${this.table} (key, value, size_bytes, expires_at, last_accessed_at) VALUES (?, ?, ?, ?, ?)`
      )
      .run(key, value, sizeBytes, expiresAt, now);

    this.enforceCapacity();
  }

  delete(key: string): boolean {
    const result = this.db
      .query(`DELETE FROM ${this.table} WHERE key = ?`)
      .run(key);
    return result.changes > 0;
  }

  stats(): CacheStats {
    this.evictExpired();
    const row = this.db
      .query<{ cnt: number; total: number }, []>(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes), 0) as total FROM ${this.table}`
      )
      .get();

    return {
      entries: row?.cnt ?? 0,
      sizeMb: (row?.total ?? 0) / (1024 * 1024),
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    this.db
      .query(
        `DELETE FROM ${this.table} WHERE expires_at IS NOT NULL AND expires_at <= ?`
      )
      .run(now);
  }

  private enforceCapacity(): void {
    const row = this.db
      .query<{ cnt: number; total: number }, []>(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes), 0) as total FROM ${this.table}`
      )
      .get();

    if (!row) {
      return;
    }

    const maxSizeBytes = this.maxSizeMb * 1024 * 1024;
    let excess = row.cnt - this.maxEntries;
    const overSize = row.total > maxSizeBytes;

    if (excess <= 0 && !overSize) {
      return;
    }

    if (excess < 1) {
      excess = 1;
    }
    if (overSize) {
      excess = Math.max(excess, Math.ceil(row.cnt * 0.1));
    }

    this.db
      .query(
        `DELETE FROM ${this.table} WHERE key IN (
          SELECT key FROM ${this.table} ORDER BY last_accessed_at ASC LIMIT ?
        )`
      )
      .run(excess);
  }
}
