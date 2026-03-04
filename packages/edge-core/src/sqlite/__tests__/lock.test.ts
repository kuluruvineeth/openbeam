import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SQLiteLock } from "../lock";

describe("SQLiteLock", () => {
  let db: Database;
  let lock: SQLiteLock;

  beforeEach(() => {
    db = new Database(":memory:");
    lock = new SQLiteLock(db);
  });

  afterEach(() => {
    db.close();
  });

  test("acquire returns true for available lock", () => {
    expect(lock.acquire("resource", "holder-1", 5000)).toBe(true);
  });

  test("acquire fails when lock held by another holder", () => {
    lock.acquire("resource", "holder-1", 5000);
    expect(lock.acquire("resource", "holder-2", 5000)).toBe(false);
  });

  test("release frees the lock", () => {
    lock.acquire("resource", "holder-1", 5000);
    expect(lock.release("resource", "holder-1")).toBe(true);
    expect(lock.acquire("resource", "holder-2", 5000)).toBe(true);
  });

  test("release returns false if holder does not match", () => {
    lock.acquire("resource", "holder-1", 5000);
    expect(lock.release("resource", "holder-2")).toBe(false);
  });

  test("release returns false for non-existent lock", () => {
    expect(lock.release("missing", "holder-1")).toBe(false);
  });

  test("isLocked returns true for active lock", () => {
    lock.acquire("resource", "holder-1", 5000);
    expect(lock.isLocked("resource")).toBe(true);
  });

  test("isLocked returns false for no lock", () => {
    expect(lock.isLocked("resource")).toBe(false);
  });

  test("isLocked returns false for expired lock", () => {
    lock.acquire("resource", "holder-1", 1);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 10;
    expect(lock.isLocked("resource")).toBe(false);
    Date.now = originalNow;
  });

  test("expired lock can be reclaimed", () => {
    const baseTime = Date.now();
    const originalNow = Date.now;

    Date.now = () => baseTime;
    lock.acquire("resource", "holder-1", 50);

    Date.now = () => baseTime + 100;
    expect(lock.acquire("resource", "holder-2", 5000)).toBe(true);
    Date.now = originalNow;
  });

  test("forceRelease removes lock regardless of holder", () => {
    lock.acquire("resource", "holder-1", 5000);
    expect(lock.forceRelease("resource")).toBe(true);
    expect(lock.isLocked("resource")).toBe(false);
  });

  test("forceRelease returns false for non-existent lock", () => {
    expect(lock.forceRelease("missing")).toBe(false);
  });

  test("multiple independent locks", () => {
    lock.acquire("lock-a", "holder-1", 5000);
    lock.acquire("lock-b", "holder-2", 5000);
    expect(lock.isLocked("lock-a")).toBe(true);
    expect(lock.isLocked("lock-b")).toBe(true);
    lock.release("lock-a", "holder-1");
    expect(lock.isLocked("lock-a")).toBe(false);
    expect(lock.isLocked("lock-b")).toBe(true);
  });

  test("same holder can acquire different locks", () => {
    expect(lock.acquire("res-1", "holder-1", 5000)).toBe(true);
    expect(lock.acquire("res-2", "holder-1", 5000)).toBe(true);
  });
});
