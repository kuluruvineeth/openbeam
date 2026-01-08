import { beforeEach, describe, expect, it } from "bun:test";
import {
  createSessionState,
  InMemoryS3SpillClient,
  InMemorySessionStateClient,
  type SessionStateOptions,
  SessionStateStore,
} from "../session-state";

describe("SessionStateStore", () => {
  let client: InMemorySessionStateClient;
  let s3Client: InMemoryS3SpillClient;
  let sessionState: SessionStateStore;

  beforeEach(() => {
    client = new InMemorySessionStateClient();
    s3Client = new InMemoryS3SpillClient();
    sessionState = new SessionStateStore({
      client,
      s3Client,
      sessionId: "test-session-123",
      spillThresholdBytes: 100,
    });
  });

  describe("basic operations", () => {
    it("stores and retrieves values", async () => {
      await sessionState.set("key1", { name: "test", value: 42 });
      const result = await sessionState.get<{ name: string; value: number }>(
        "key1"
      );

      expect(result).toEqual({ name: "test", value: 42 });
    });

    it("returns null for non-existent keys", async () => {
      const result = await sessionState.get("nonexistent");
      expect(result).toBeNull();
    });

    it("deletes values", async () => {
      await sessionState.set("key1", "value1");
      await sessionState.delete("key1");

      const result = await sessionState.get("key1");
      expect(result).toBeNull();
    });

    it("checks existence", async () => {
      await sessionState.set("key1", "value1");

      expect(await sessionState.exists("key1")).toBe(true);
      expect(await sessionState.exists("nonexistent")).toBe(false);
    });

    it("returns session ID", () => {
      expect(sessionState.getSessionId()).toBe("test-session-123");
    });
  });

  describe("list operation", () => {
    it("lists all keys in session", async () => {
      await sessionState.set("key1", "value1");
      await sessionState.set("key2", "value2");
      await sessionState.set("key3", "value3");

      const metadata = await sessionState.list();

      expect(metadata).toHaveLength(3);
      expect(metadata.map((m) => m.key).sort()).toEqual([
        "key1",
        "key2",
        "key3",
      ]);
    });

    it("returns metadata for each key", async () => {
      await sessionState.set("key1", { data: "test" });

      const metadata = await sessionState.list();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.key).toBe("key1");
      expect(metadata[0]?.size).toBeGreaterThan(0);
      expect(metadata[0]?.createdAt).toBeGreaterThan(0);
      expect(metadata[0]?.updatedAt).toBeGreaterThan(0);
      expect(metadata[0]?.spilledToS3).toBe(false);
    });
  });

  describe("S3 spill for large values", () => {
    it("spills large values to S3", async () => {
      const largeValue = { data: "x".repeat(200) };
      await sessionState.set("large", largeValue);

      const metadata = await sessionState.list();
      expect(metadata[0]?.spilledToS3).toBe(true);

      const result = await sessionState.get<typeof largeValue>("large");
      expect(result).toEqual(largeValue);
    });

    it("stores small values in Redis", async () => {
      const smallValue = { data: "small" };
      await sessionState.set("small", smallValue);

      const metadata = await sessionState.list();
      expect(metadata[0]?.spilledToS3).toBe(false);
    });

    it("deletes S3 data when key is deleted", async () => {
      const largeValue = { data: "x".repeat(200) };
      await sessionState.set("large", largeValue);

      await sessionState.delete("large");

      expect(await sessionState.exists("large")).toBe(false);
    });
  });

  describe("clear operation", () => {
    it("clears all session state", async () => {
      await sessionState.set("key1", "value1");
      await sessionState.set("key2", "value2");
      await sessionState.set("large", { data: "x".repeat(200) });

      await sessionState.clear();

      const metadata = await sessionState.list();
      expect(metadata).toHaveLength(0);
    });
  });

  describe("session isolation", () => {
    it("isolates data between sessions", async () => {
      const session1 = new SessionStateStore({
        client,
        sessionId: "session-1",
      });
      const session2 = new SessionStateStore({
        client,
        sessionId: "session-2",
      });

      await session1.set("key", "value1");
      await session2.set("key", "value2");

      expect(await session1.get<string>("key")).toBe("value1");
      expect(await session2.get<string>("key")).toBe("value2");
    });
  });

  describe("TTL support", () => {
    it("respects TTL for stored values", async () => {
      await sessionState.set("expiring", "value", 100);

      const immediate = await sessionState.get("expiring");
      expect(immediate).toBe("value");
    });
  });
});

describe("createSessionState", () => {
  it("creates session state with default options", () => {
    const client = new InMemorySessionStateClient();
    const options: SessionStateOptions = {
      client,
      sessionId: "test",
    };

    const state = createSessionState(options);
    expect(state.getSessionId()).toBe("test");
  });
});

describe("InMemorySessionStateClient", () => {
  let client: InMemorySessionStateClient;

  beforeEach(() => {
    client = new InMemorySessionStateClient();
  });

  it("handles basic CRUD operations", async () => {
    await client.set("key", "value");
    expect(await client.get("key")).toBe("value");

    await client.del("key");
    expect(await client.get("key")).toBeNull();
  });

  it("supports key pattern matching", async () => {
    await client.set("prefix:key1", "value1");
    await client.set("prefix:key2", "value2");
    await client.set("other:key3", "value3");

    const keys = await client.keys("prefix:*");
    expect(keys.sort()).toEqual(["prefix:key1", "prefix:key2"]);
  });

  it("stores with TTL", async () => {
    await client.set("key", "value", 3600);

    const value = await client.get("key");
    expect(value).toBe("value");
  });

  it("clears all data", async () => {
    await client.set("key1", "value1");
    await client.set("key2", "value2");

    client.clear();

    expect(await client.get("key1")).toBeNull();
    expect(await client.get("key2")).toBeNull();
  });
});

describe("InMemoryS3SpillClient", () => {
  let s3Client: InMemoryS3SpillClient;

  beforeEach(() => {
    s3Client = new InMemoryS3SpillClient();
  });

  it("uploads and downloads data", async () => {
    const data = Buffer.from("test data");
    await s3Client.upload("key", data);

    const result = await s3Client.download("key");
    expect(result.toString()).toBe("test data");
  });

  it("deletes data", async () => {
    await s3Client.upload("key", Buffer.from("test"));
    await s3Client.delete("key");

    await expect(s3Client.download("key")).rejects.toThrow("S3 key not found");
  });

  it("throws on missing key", async () => {
    await expect(s3Client.download("nonexistent")).rejects.toThrow(
      "S3 key not found"
    );
  });

  it("clears all data", async () => {
    await s3Client.upload("key1", Buffer.from("data1"));
    await s3Client.upload("key2", Buffer.from("data2"));

    s3Client.clear();

    await expect(s3Client.download("key1")).rejects.toThrow();
  });
});
