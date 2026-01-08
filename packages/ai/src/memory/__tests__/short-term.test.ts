import { beforeEach, describe, expect, it } from "bun:test";
import {
  createShortTermMemory,
  InMemoryShortTermClient,
  type ShortTermMemory,
} from "../short-term";

describe("ShortTermMemoryStore", () => {
  let client: InMemoryShortTermClient;
  let memory: ShortTermMemory;

  beforeEach(() => {
    client = new InMemoryShortTermClient();
    memory = createShortTermMemory({
      client,
      keyPrefix: "test:",
      defaultTtlSeconds: 60,
    });
  });

  describe("store and retrieve", () => {
    it("stores and retrieves a string value", async () => {
      await memory.store("greeting", "hello");

      const result = await memory.retrieve<string>("greeting");

      expect(result).toBe("hello");
    });

    it("stores and retrieves an object", async () => {
      const data = { name: "test", count: 42 };
      await memory.store("data", data);

      const result = await memory.retrieve<typeof data>("data");

      expect(result).toEqual(data);
    });

    it("stores and retrieves an array", async () => {
      const items = [1, 2, 3, 4, 5];
      await memory.store("items", items);

      const result = await memory.retrieve<number[]>("items");

      expect(result).toEqual(items);
    });

    it("returns null for non-existent key", async () => {
      const result = await memory.retrieve("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("TTL support", () => {
    it("expires values after TTL", async () => {
      await memory.store("ephemeral", "temp", 1000);

      await new Promise((r) => setTimeout(r, 1100));

      const result = await memory.retrieve("ephemeral");
      expect(result).toBeNull();
    });

    it("keeps values within TTL", async () => {
      await memory.store("persistent", "keep", 10_000);

      const result = await memory.retrieve("persistent");
      expect(result).toBe("keep");
    });

    it("extends TTL for existing key", async () => {
      await memory.store("extendable", "value", 1000);

      await memory.extend("extendable", 5000);

      await new Promise((r) => setTimeout(r, 1100));

      const result = await memory.retrieve("extendable");
      expect(result).toBe("value");
    });
  });

  describe("delete", () => {
    it("removes stored value", async () => {
      await memory.store("deleteme", "value");

      await memory.delete("deleteme");

      const result = await memory.retrieve("deleteme");
      expect(result).toBeNull();
    });

    it("handles deletion of non-existent key", async () => {
      await memory.delete("nonexistent");
    });
  });

  describe("exists", () => {
    it("returns true for existing key", async () => {
      await memory.store("exists", "value");

      const result = await memory.exists("exists");

      expect(result).toBe(true);
    });

    it("returns false for non-existent key", async () => {
      const result = await memory.exists("nonexistent");

      expect(result).toBe(false);
    });

    it("returns false for expired key", async () => {
      await memory.store("expired", "value", 1000);

      await new Promise((r) => setTimeout(r, 1100));

      const result = await memory.exists("expired");
      expect(result).toBe(false);
    });
  });

  describe("list", () => {
    it("lists keys by prefix", async () => {
      await memory.store("user:1", { id: 1 });
      await memory.store("user:2", { id: 2 });
      await memory.store("session:1", { id: "s1" });

      const userKeys = await memory.list("user:");

      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain("user:1");
      expect(userKeys).toContain("user:2");
    });

    it("returns empty array when no matches", async () => {
      await memory.store("other:1", "value");

      const result = await memory.list("nonexistent:");

      expect(result).toEqual([]);
    });

    it("excludes expired keys from listing", async () => {
      await memory.store("temp:1", "value", 1000);
      await memory.store("temp:2", "value", 10_000);

      await new Promise((r) => setTimeout(r, 1100));

      const result = await memory.list("temp:");
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("temp:2");
    });
  });

  describe("key prefixing", () => {
    it("isolates keys with different prefixes", async () => {
      const memory1 = createShortTermMemory({
        client,
        keyPrefix: "app1:",
      });
      const memory2 = createShortTermMemory({
        client,
        keyPrefix: "app2:",
      });

      await memory1.store("shared", "value1");
      await memory2.store("shared", "value2");

      expect(await memory1.retrieve<string>("shared")).toBe("value1");
      expect(await memory2.retrieve<string>("shared")).toBe("value2");
    });
  });
});

describe("InMemoryShortTermClient", () => {
  let client: InMemoryShortTermClient;

  beforeEach(() => {
    client = new InMemoryShortTermClient();
  });

  it("clears all entries", async () => {
    await client.set("key1", "value1");
    await client.set("key2", "value2");

    client.clear();

    expect(await client.get("key1")).toBeNull();
    expect(await client.get("key2")).toBeNull();
  });

  it("handles pattern matching with wildcards", async () => {
    await client.set("user:123:session", "s1");
    await client.set("user:456:session", "s2");
    await client.set("team:123:session", "t1");

    const matches = await client.keys("user:*:session");

    expect(matches).toHaveLength(2);
    expect(matches).toContain("user:123:session");
    expect(matches).toContain("user:456:session");
  });
});
