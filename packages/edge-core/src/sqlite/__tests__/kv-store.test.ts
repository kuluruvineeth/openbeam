import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SQLiteKVStore } from "../kv-store";

describe("SQLiteKVStore", () => {
  let db: Database;
  let store: SQLiteKVStore;

  beforeEach(() => {
    db = new Database(":memory:");
    store = new SQLiteKVStore(db, "kv");
  });

  afterEach(() => {
    db.close();
  });

  test("get returns undefined for missing key", () => {
    expect(store.get("missing")).toBeUndefined();
  });

  test("set and get round-trip", () => {
    store.set("key1", "value1");
    expect(store.get("key1")).toBe("value1");
  });

  test("set overwrites existing key", () => {
    store.set("key1", "v1");
    store.set("key1", "v2");
    expect(store.get("key1")).toBe("v2");
  });

  test("delete removes key", () => {
    store.set("key1", "value1");
    expect(store.delete("key1")).toBe(true);
    expect(store.get("key1")).toBeUndefined();
  });

  test("delete returns false for missing key", () => {
    expect(store.delete("missing")).toBe(false);
  });

  test("has returns true for existing key", () => {
    store.set("key1", "value1");
    expect(store.has("key1")).toBe(true);
  });

  test("has returns false for missing key", () => {
    expect(store.has("missing")).toBe(false);
  });

  test("keys returns all keys", () => {
    store.set("a", "1");
    store.set("b", "2");
    store.set("c", "3");
    const result = store.keys();
    expect(result.sort()).toEqual(["a", "b", "c"]);
  });

  test("keys with prefix filters by prefix", () => {
    store.set("user:1", "alice");
    store.set("user:2", "bob");
    store.set("session:1", "tok");
    expect(store.keys("user:").sort()).toEqual(["user:1", "user:2"]);
  });

  test("clear removes all entries", () => {
    store.set("a", "1");
    store.set("b", "2");
    store.clear();
    expect(store.keys()).toEqual([]);
  });

  test("TTL expires keys", () => {
    const frozen = Date.now();
    const originalNow = Date.now;
    Date.now = () => frozen;
    store.set("ephemeral", "data", 100);
    expect(store.get("ephemeral")).toBe("data");

    Date.now = () => frozen + 200;
    expect(store.get("ephemeral")).toBeUndefined();
    Date.now = originalNow;
  });

  test("has returns false for expired key", () => {
    const frozen = Date.now();
    const originalNow = Date.now;
    Date.now = () => frozen;
    store.set("temp", "val", 100);

    Date.now = () => frozen + 200;
    expect(store.has("temp")).toBe(false);
    Date.now = originalNow;
  });

  test("evictExpired cleans up expired entries", () => {
    const baseTime = Date.now();
    const originalNow = Date.now;
    Date.now = () => baseTime;

    store.set("a", "1", 50);
    store.set("b", "2", 100);
    store.set("c", "3");

    Date.now = () => baseTime + 75;
    const evicted = store.evictExpired();
    expect(evicted).toBe(1);
    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(true);
    expect(store.has("c")).toBe(true);

    Date.now = originalNow;
  });

  test("stores empty string value", () => {
    store.set("empty", "");
    expect(store.get("empty")).toBe("");
  });

  test("stores JSON as string", () => {
    const json = JSON.stringify({ hello: "world" });
    store.set("json", json);
    expect(store.get("json")).toBe(json);
  });

  test("multiple stores with different tables are independent", () => {
    const store2 = new SQLiteKVStore(db, "kv2");
    store.set("key", "from-kv1");
    store2.set("key", "from-kv2");
    expect(store.get("key")).toBe("from-kv1");
    expect(store2.get("key")).toBe("from-kv2");
  });
});
