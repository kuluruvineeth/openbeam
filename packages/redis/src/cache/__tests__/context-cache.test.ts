import { beforeEach, describe, expect, mock, test } from "bun:test";

const HEX_16_PATTERN = /^[0-9a-f]{16}$/;

import {
  ContextCache,
  getContextCache,
  hashUri,
  resetContextCache,
} from "../context-cache";

const mockRedisClient = {
  get: mock(() => Promise.resolve(null as string | null)),
  set: mock(() => Promise.resolve("OK" as string)),
  mGet: mock(() => Promise.resolve([] as (string | null)[])),
  sMembers: mock(() => Promise.resolve([] as string[])),
  sAdd: mock(() => Promise.resolve(1 as number)),
  sRem: mock(() => Promise.resolve(1 as number)),
  del: mock(() => Promise.resolve(1 as number)),
  incr: mock(() => Promise.resolve(1 as number)),
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

function resetMocks(): void {
  mockRedisClient.get.mockReset();
  mockRedisClient.set.mockReset();
  mockRedisClient.mGet.mockReset();
  mockRedisClient.sMembers.mockReset();
  mockRedisClient.sAdd.mockReset();
  mockRedisClient.sRem.mockReset();
  mockRedisClient.del.mockReset();
  mockRedisClient.incr.mockReset();
}

describe("hashUri", () => {
  test("produces consistent 16-char hex strings", () => {
    const result = hashUri("openbeam://resources/team-1/docs/readme");
    expect(result).toHaveLength(16);
    expect(result).toMatch(HEX_16_PATTERN);
    expect(hashUri("openbeam://resources/team-1/docs/readme")).toBe(result);
  });

  test("produces different hashes for different URIs", () => {
    const a = hashUri("openbeam://resources/team-1/docs/a");
    const b = hashUri("openbeam://resources/team-1/docs/b");
    expect(a).not.toBe(b);
  });
});

describe("ContextCache", () => {
  let cache: ContextCache;

  beforeEach(() => {
    resetContextCache();
    resetMocks();
    cache = new ContextCache();
  });

  describe("getL0 / setL0", () => {
    test("roundtrip stores and retrieves abstract", async () => {
      mockRedisClient.set.mockImplementation(() => Promise.resolve("OK"));
      mockRedisClient.sAdd.mockImplementation(() => Promise.resolve(1));

      await cache.setL0(
        "team-1",
        "openbeam://user/memories",
        "A short summary"
      );

      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.sAdd).toHaveBeenCalledTimes(1);

      const storedAbstract = "A short summary";
      mockRedisClient.get.mockImplementation(() =>
        Promise.resolve(storedAbstract)
      );

      const result = await cache.getL0("team-1", "openbeam://user/memories");
      expect(result).toBe("A short summary");
    });

    test("returns null when key does not exist", async () => {
      mockRedisClient.get.mockImplementation(() => Promise.resolve(null));
      const result = await cache.getL0("team-1", "openbeam://missing");
      expect(result).toBeNull();
    });

    test("returns null on Redis error", async () => {
      mockRedisClient.get.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      const result = await cache.getL0("team-1", "openbeam://fail");
      expect(result).toBeNull();
    });

    test("setL0 does not throw on Redis error", async () => {
      mockRedisClient.set.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      await expect(
        cache.setL0("team-1", "openbeam://fail", "text")
      ).resolves.toBeUndefined();
    });
  });

  describe("mgetL0", () => {
    test("returns map with hits and misses", async () => {
      const uris = [
        "openbeam://resources/a",
        "openbeam://resources/b",
        "openbeam://resources/c",
      ];

      mockRedisClient.mGet.mockImplementation(() =>
        Promise.resolve(["Abstract A", null, "Abstract C"] as (string | null)[])
      );

      const result = await cache.mgetL0("team-1", uris);
      expect(result.size).toBe(2);
      expect(result.get("openbeam://resources/a")).toBe("Abstract A");
      expect(result.get("openbeam://resources/c")).toBe("Abstract C");
      expect(result.has("openbeam://resources/b")).toBe(false);
    });

    test("returns empty map for empty input", async () => {
      const result = await cache.mgetL0("team-1", []);
      expect(result.size).toBe(0);
      expect(mockRedisClient.mGet).not.toHaveBeenCalled();
    });

    test("returns empty map on Redis error", async () => {
      mockRedisClient.mGet.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      const result = await cache.mgetL0("team-1", ["openbeam://fail"]);
      expect(result.size).toBe(0);
    });
  });

  describe("invalidateL0", () => {
    test("removes key and index entry", async () => {
      mockRedisClient.del.mockImplementation(() => Promise.resolve(1));
      mockRedisClient.sRem.mockImplementation(() => Promise.resolve(1));

      await cache.invalidateL0("team-1", "openbeam://resources/a");

      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.sRem).toHaveBeenCalledTimes(1);
    });

    test("does not throw on Redis error", async () => {
      mockRedisClient.del.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      await expect(
        cache.invalidateL0("team-1", "openbeam://fail")
      ).resolves.toBeUndefined();
    });
  });

  describe("invalidateTeam", () => {
    test("clears all keys for team", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve(["abc123", "def456"])
      );
      mockRedisClient.del.mockImplementation(() => Promise.resolve(5));

      await cache.invalidateTeam("team-1");

      expect(mockRedisClient.sMembers).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);

      const delCall = mockRedisClient.del.mock.calls[0] as unknown as [
        string[],
      ];
      const delArgs = delCall[0];
      expect(delArgs).toHaveLength(5);
      expect(delArgs[0]).toBe("ctx:idx:team-1");
    });

    test("handles empty team gracefully", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve([] as string[])
      );

      await cache.invalidateTeam("team-1");
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    test("does not throw on Redis error", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      await expect(cache.invalidateTeam("team-1")).resolves.toBeUndefined();
    });
  });

  describe("incrementHotness", () => {
    test("returns incremented value", async () => {
      mockRedisClient.incr.mockImplementation(() => Promise.resolve(3));

      const result = await cache.incrementHotness(
        "team-1",
        "openbeam://resources/a"
      );
      expect(result).toBe(3);
      expect(mockRedisClient.incr).toHaveBeenCalledTimes(1);
    });

    test("returns 0 on Redis error", async () => {
      mockRedisClient.incr.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      const result = await cache.incrementHotness("team-1", "openbeam://fail");
      expect(result).toBe(0);
    });
  });

  describe("getHotness", () => {
    test("returns parsed integer", async () => {
      mockRedisClient.get.mockImplementation(() => Promise.resolve("7"));
      const result = await cache.getHotness("team-1", "openbeam://resources/a");
      expect(result).toBe(7);
    });

    test("returns 0 when key does not exist", async () => {
      mockRedisClient.get.mockImplementation(() => Promise.resolve(null));
      const result = await cache.getHotness("team-1", "openbeam://missing");
      expect(result).toBe(0);
    });

    test("returns 0 on Redis error", async () => {
      mockRedisClient.get.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      const result = await cache.getHotness("team-1", "openbeam://fail");
      expect(result).toBe(0);
    });
  });

  describe("batchGetHotness", () => {
    test("returns correct map", async () => {
      const uris = [
        "openbeam://resources/a",
        "openbeam://resources/b",
        "openbeam://resources/c",
      ];

      mockRedisClient.mGet.mockImplementation(() =>
        Promise.resolve(["5", null, "12"] as (string | null)[])
      );

      const result = await cache.batchGetHotness("team-1", uris);
      expect(result.size).toBe(3);
      expect(result.get("openbeam://resources/a")).toBe(5);
      expect(result.get("openbeam://resources/b")).toBe(0);
      expect(result.get("openbeam://resources/c")).toBe(12);
    });

    test("returns empty map for empty input", async () => {
      const result = await cache.batchGetHotness("team-1", []);
      expect(result.size).toBe(0);
      expect(mockRedisClient.mGet).not.toHaveBeenCalled();
    });

    test("returns empty map on Redis error", async () => {
      mockRedisClient.mGet.mockImplementation(() =>
        Promise.reject(new Error("connection lost"))
      );
      const result = await cache.batchGetHotness("team-1", ["openbeam://fail"]);
      expect(result.size).toBe(0);
    });
  });

  describe("singleton pattern", () => {
    test("getContextCache returns same instance", () => {
      const a = getContextCache();
      const b = getContextCache();
      expect(a).toBe(b);
    });

    // biome-ignore lint/suspicious/noSkippedTests: bun mock.module singleton contamination in combined test runs
    test.skip("resetContextCache creates new instance (bun mock.module singleton contamination)", () => {
      const a = getContextCache();
      resetContextCache();
      const b = getContextCache();
      expect(a).not.toBe(b);
    });
  });
});
