import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SQLiteCache } from "../cache";

describe("SQLiteCache", () => {
  let db: Database;
  let cache: SQLiteCache;

  beforeEach(() => {
    db = new Database(":memory:");
    cache = new SQLiteCache(db, { maxEntries: 5 });
  });

  afterEach(() => {
    db.close();
  });

  test("get returns undefined for missing key", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  test("set and get round-trip", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  test("set overwrites existing key", () => {
    cache.set("key1", "v1");
    cache.set("key1", "v2");
    expect(cache.get("key1")).toBe("v2");
  });

  test("delete removes key", () => {
    cache.set("key1", "value1");
    expect(cache.delete("key1")).toBe(true);
    expect(cache.get("key1")).toBeUndefined();
  });

  test("delete returns false for missing key", () => {
    expect(cache.delete("missing")).toBe(false);
  });

  test("stats reports entry count and size", () => {
    cache.set("a", "hello");
    cache.set("b", "world");
    const s = cache.stats();
    expect(s.entries).toBe(2);
    expect(s.sizeMb).toBeGreaterThan(0);
  });

  test("stats returns zero for empty cache", () => {
    const s = cache.stats();
    expect(s.entries).toBe(0);
    expect(s.sizeMb).toBe(0);
  });

  test("TTL expires entries", () => {
    cache.set("temp", "data", 1);
    expect(cache.get("temp")).toBe("data");

    const originalNow = Date.now;
    Date.now = () => originalNow() + 10;
    expect(cache.get("temp")).toBeUndefined();
    Date.now = originalNow;
  });

  test("LRU eviction removes least recently accessed", () => {
    const originalNow = Date.now;
    let time = 1000;
    Date.now = () => time;

    cache.set("a", "1");
    time += 1;
    cache.set("b", "2");
    time += 1;
    cache.set("c", "3");
    time += 1;
    cache.set("d", "4");
    time += 1;
    cache.set("e", "5");
    time += 1;

    cache.get("a");
    time += 1;
    cache.get("b");
    time += 1;

    cache.set("f", "6");

    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBe("2");
    expect(cache.get("f")).toBe("6");
    Date.now = originalNow;
  });

  test("default TTL applies when no explicit TTL", () => {
    const cacheWithDefault = new SQLiteCache(db, {
      tableName: "cache_ttl",
      defaultTtlMs: 50,
    });
    cacheWithDefault.set("key", "val");

    const originalNow = Date.now;
    Date.now = () => originalNow() + 100;
    expect(cacheWithDefault.get("key")).toBeUndefined();
    Date.now = originalNow;
  });

  test("explicit TTL overrides default", () => {
    const cacheWithDefault = new SQLiteCache(db, {
      tableName: "cache_ttl2",
      defaultTtlMs: 10,
      maxEntries: 100,
    });
    cacheWithDefault.set("key", "val", 500);

    const originalNow = Date.now;
    Date.now = () => originalNow() + 50;
    expect(cacheWithDefault.get("key")).toBe("val");
    Date.now = originalNow;
  });

  test("custom table name isolates data", () => {
    const cache2 = new SQLiteCache(db, { tableName: "other_cache" });
    cache.set("k", "from-cache1");
    cache2.set("k", "from-cache2");
    expect(cache.get("k")).toBe("from-cache1");
    expect(cache2.get("k")).toBe("from-cache2");
  });

  test("get updates last_accessed_at for LRU tracking", () => {
    const originalNow = Date.now;
    let time = 1000;
    Date.now = () => time;

    cache.set("old", "1");
    time += 1;
    cache.set("new", "2");
    time += 1;

    cache.get("old");
    time += 1;

    cache.set("x", "3");
    time += 1;
    cache.set("y", "4");
    time += 1;
    cache.set("z", "5");
    time += 1;
    cache.set("overflow", "6");

    expect(cache.get("old")).toBe("1");
    Date.now = originalNow;
  });
});
