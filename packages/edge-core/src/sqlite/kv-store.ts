import type { Database } from "bun:sqlite";

export class SQLiteKVStore {
  private readonly db: Database;
  private readonly table: string;

  constructor(db: Database, table: string) {
    this.db = db;
    this.table = table;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        key TEXT PRIMARY KEY,
        value TEXT,
        expires_at INTEGER
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
    return row?.value;
  }

  set(key: string, value: string, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.db
      .query(
        `INSERT OR REPLACE INTO ${this.table} (key, value, expires_at) VALUES (?, ?, ?)`
      )
      .run(key, value, expiresAt);
  }

  delete(key: string): boolean {
    const result = this.db
      .query(`DELETE FROM ${this.table} WHERE key = ?`)
      .run(key);
    return result.changes > 0;
  }

  has(key: string): boolean {
    this.evictExpired();
    const row = this.db
      .query<{ c: number }, [string]>(
        `SELECT COUNT(*) as c FROM ${this.table} WHERE key = ?`
      )
      .get(key);
    return (row?.c ?? 0) > 0;
  }

  keys(prefix?: string): string[] {
    this.evictExpired();
    if (prefix) {
      const rows = this.db
        .query<{ key: string }, [string]>(
          `SELECT key FROM ${this.table} WHERE key LIKE ?`
        )
        .all(`${prefix}%`);
      return rows.map((r) => r.key);
    }
    const rows = this.db
      .query<{ key: string }, []>(`SELECT key FROM ${this.table}`)
      .all();
    return rows.map((r) => r.key);
  }

  clear(): void {
    this.db.exec(`DELETE FROM ${this.table}`);
  }

  evictExpired(): number {
    const now = Date.now();
    const result = this.db
      .query(
        `DELETE FROM ${this.table} WHERE expires_at IS NOT NULL AND expires_at <= ?`
      )
      .run(now);
    return result.changes;
  }
}
