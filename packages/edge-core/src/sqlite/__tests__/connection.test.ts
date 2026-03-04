import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { openEdgeDatabase } from "../connection";

function cleanupFile(path: string) {
  try {
    unlinkSync(path);
  } catch (_e) {
    /* file may not exist */
  }
}

describe("openEdgeDatabase", () => {
  test("creates database with WAL journal mode on file-backed db", () => {
    const path = `/tmp/edge-test-${Date.now()}.db`;
    const db = openEdgeDatabase(path);
    const row = db
      .query<{ journal_mode: string }, []>("PRAGMA journal_mode")
      .get();
    expect(row?.journal_mode).toBe("wal");
    db.close();
    cleanupFile(path);
    cleanupFile(`${path}-wal`);
    cleanupFile(`${path}-shm`);
  });

  test("enables foreign keys", () => {
    const db = openEdgeDatabase(":memory:");
    const row = db
      .query<{ foreign_keys: number }, []>("PRAGMA foreign_keys")
      .get();
    expect(row?.foreign_keys).toBe(1);
    db.close();
  });

  test("sets busy timeout to 5000", () => {
    const db = openEdgeDatabase(":memory:");
    const row = db.query<{ timeout: number }, []>("PRAGMA busy_timeout").get();
    expect(row?.timeout).toBe(5000);
    db.close();
  });

  test("sets synchronous to NORMAL", () => {
    const db = openEdgeDatabase(":memory:");
    const row = db
      .query<{ synchronous: number }, []>("PRAGMA synchronous")
      .get();
    expect(row?.synchronous).toBe(1);
    db.close();
  });

  test("returns a usable Database instance", () => {
    const db = openEdgeDatabase(":memory:");
    expect(db).toBeInstanceOf(Database);
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
    db.exec("INSERT INTO t (id) VALUES (1)");
    const row = db.query<{ id: number }, []>("SELECT id FROM t").get();
    expect(row?.id).toBe(1);
    db.close();
  });
});
