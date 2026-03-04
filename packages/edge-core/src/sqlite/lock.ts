import type { Database } from "bun:sqlite";

export class SQLiteLock {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locks (
        name TEXT PRIMARY KEY,
        holder TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);
  }

  acquire(name: string, holder: string, ttlMs: number): boolean {
    const now = Date.now();
    this.db
      .query("DELETE FROM locks WHERE name = ? AND expires_at <= ?")
      .run(name, now);

    try {
      this.db
        .query(
          "INSERT INTO locks (name, holder, acquired_at, expires_at) VALUES (?, ?, ?, ?)"
        )
        .run(name, holder, now, now + ttlMs);
      return true;
    } catch {
      return false;
    }
  }

  release(name: string, holder: string): boolean {
    const result = this.db
      .query("DELETE FROM locks WHERE name = ? AND holder = ?")
      .run(name, holder);
    return result.changes > 0;
  }

  isLocked(name: string): boolean {
    const now = Date.now();
    const row = this.db
      .query<{ c: number }, [string, number]>(
        "SELECT COUNT(*) as c FROM locks WHERE name = ? AND expires_at > ?"
      )
      .get(name, now);
    return (row?.c ?? 0) > 0;
  }

  forceRelease(name: string): boolean {
    const result = this.db.query("DELETE FROM locks WHERE name = ?").run(name);
    return result.changes > 0;
  }
}
