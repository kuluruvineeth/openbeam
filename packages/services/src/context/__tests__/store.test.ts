import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ContextStore } from "../store";
import { generateEntryId } from "../uri";

const mockDb = {
  contextEntry: {
    findUnique: mock(() => null),
    findMany: mock(() => []),
    upsert: mock(() => ({})),
    updateMany: mock(() => ({ count: 1 })),
    deleteMany: mock(() => ({ count: 1 })),
  },
  contextRelation: {
    create: mock(() => ({})),
    findMany: mock(() => []),
    deleteMany: mock(() => ({ count: 1 })),
  },
};

type MockDb = typeof mockDb;

const mockCache = {
  getL0: mock(() => Promise.resolve(null as string | null)),
  setL0: mock(() => Promise.resolve()),
  invalidateL0: mock(() => Promise.resolve()),
  incrementHotness: mock(() => Promise.resolve(1)),
};

const mockVespaClient = {
  deleteContextEntry: mock(() => Promise.resolve()),
};

type MockFn = ReturnType<typeof mock>;

const entry = (mockDb as MockDb).contextEntry;
const relation = (mockDb as MockDb).contextRelation;

mock.module("@openbeam/db", () => ({
  findContextEntry: (...args: unknown[]) => entry.findUnique(...args),
  listContextChildren: (...args: unknown[]) => entry.findMany(...args),
  findContextRelations: (...args: unknown[]) => relation.findMany(...args),
  upsertContextEntry: (...args: unknown[]) => entry.upsert(...args),
  deleteContextEntry: (...args: unknown[]) => entry.deleteMany(...args),
  incrementActiveCount: (...args: unknown[]) => entry.updateMany(...args),
  createContextRelation: (...args: unknown[]) => relation.create(...args),
  deleteContextRelation: (...args: unknown[]) => relation.deleteMany(...args),
}));

mock.module("@openbeam/redis", () => ({
  getContextCache: () => mockCache,
}));

mock.module("@openbeam/vespa", () => ({
  vespaClient: mockVespaClient,
}));

const TEAM_ID = "team_test";
const URI = "openbeam://user/team_test/user_1/memories";
const ENTRY_ID = generateEntryId(TEAM_ID, URI);

const SAMPLE_ENTRY = {
  id: ENTRY_ID,
  uri: URI,
  parentUri: "openbeam://user/team_test/user_1",
  teamId: TEAM_ID,
  ownerId: "user_1",
  ownerType: "user",
  contextType: "memory",
  category: "preferences",
  isLeaf: true,
  abstractText: "User coding preferences",
  overview: "Prefers TypeScript with strict mode",
  content: "Detailed preferences including editor settings and linting rules",
  activeCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function resetAllMocks(): void {
  for (const method of Object.values(entry)) {
    (method as MockFn).mockReset();
  }
  for (const method of Object.values(relation)) {
    (method as MockFn).mockReset();
  }
  mockCache.getL0.mockReset();
  mockCache.setL0.mockReset();
  mockCache.invalidateL0.mockReset();
  mockCache.incrementHotness.mockReset();
  mockVespaClient.deleteContextEntry.mockReset();
}

describe("ContextStore", () => {
  let store: ContextStore;

  beforeEach(() => {
    store = new ContextStore(mockDb as never);
    resetAllMocks();
  });

  describe("create", () => {
    it("generates correct ID and upserts", async () => {
      const upsertMock = entry.upsert as MockFn;
      upsertMock.mockReturnValue(SAMPLE_ENTRY);

      const result = await store.create({
        uri: URI,
        teamId: TEAM_ID,
        ownerId: "user_1",
        ownerType: "user",
        contextType: "memory",
        category: "preferences",
        abstractText: "User coding preferences",
      });

      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(result.uri).toBe(URI);
      expect(mockCache.invalidateL0).toHaveBeenCalledTimes(1);
    });
  });

  describe("read", () => {
    it("delegates to DB", async () => {
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(SAMPLE_ENTRY);

      const result = await store.read(TEAM_ID, URI);
      expect(result).not.toBeNull();
      expect(result?.uri).toBe(URI);
      expect(findMock).toHaveBeenCalledTimes(1);
    });

    it("returns null when not found", async () => {
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(null);

      const result = await store.read(TEAM_ID, URI);
      expect(result).toBeNull();
    });
  });

  describe("readL0", () => {
    it("returns cached value when available", async () => {
      mockCache.getL0.mockReturnValue(Promise.resolve("cached abstract"));

      const result = await store.readL0(TEAM_ID, URI);
      expect(result).toBe("cached abstract");
      expect(mockCache.setL0).not.toHaveBeenCalled();
    });

    it("falls back to DB and caches on miss", async () => {
      mockCache.getL0.mockReturnValue(Promise.resolve(null));
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(SAMPLE_ENTRY);

      const result = await store.readL0(TEAM_ID, URI);
      expect(result).toBe("User coding preferences");
      expect(mockCache.setL0).toHaveBeenCalledTimes(1);
    });

    it("returns null when not in cache or DB", async () => {
      mockCache.getL0.mockReturnValue(Promise.resolve(null));
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(null);

      const result = await store.readL0(TEAM_ID, URI);
      expect(result).toBeNull();
    });
  });

  describe("readL1", () => {
    it("returns overview from DB", async () => {
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(SAMPLE_ENTRY);

      const result = await store.readL1(TEAM_ID, URI);
      expect(result).toBe("Prefers TypeScript with strict mode");
    });
  });

  describe("readL2", () => {
    it("returns content from DB", async () => {
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(SAMPLE_ENTRY);

      const result = await store.readL2(TEAM_ID, URI);
      expect(result).toBe(
        "Detailed preferences including editor settings and linting rules"
      );
    });
  });

  describe("update", () => {
    it("invalidates cache after update", async () => {
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(SAMPLE_ENTRY);
      const upsertMock = entry.upsert as MockFn;
      upsertMock.mockReturnValue({ ...SAMPLE_ENTRY, abstractText: "Updated" });

      const result = await store.update(TEAM_ID, URI, {
        abstractText: "Updated",
      });
      expect(result.abstractText).toBe("Updated");
      expect(mockCache.invalidateL0).toHaveBeenCalledTimes(1);
    });

    it("throws when entry not found", async () => {
      const findMock = entry.findUnique as MockFn;
      findMock.mockReturnValue(null);

      await expect(
        store.update(TEAM_ID, URI, { abstractText: "x" })
      ).rejects.toThrow("Context entry not found");
    });
  });

  describe("delete", () => {
    it("removes from DB, cache, and Vespa", async () => {
      const deleteMock = entry.deleteMany as MockFn;

      await store.delete(TEAM_ID, URI);

      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(mockCache.invalidateL0).toHaveBeenCalledTimes(1);
      expect(mockVespaClient.deleteContextEntry).toHaveBeenCalledWith(ENTRY_ID);
    });

    it("swallows Vespa errors gracefully", async () => {
      mockVespaClient.deleteContextEntry.mockImplementation(() => {
        throw new Error("Vespa down");
      });

      await expect(store.delete(TEAM_ID, URI)).resolves.toBeUndefined();
    });
  });

  describe("list", () => {
    it("returns children from DB", async () => {
      const findManyMock = entry.findMany as MockFn;
      findManyMock.mockReturnValue([SAMPLE_ENTRY]);

      const result = await store.list(
        TEAM_ID,
        "openbeam://user/team_test/user_1"
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.uri).toBe(URI);
    });
  });

  describe("link / unlink", () => {
    it("creates a relation", async () => {
      const createMock = relation.create as MockFn;

      await store.link(
        TEAM_ID,
        URI,
        "openbeam://tools/team_test/search",
        "used by"
      );
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it("deletes a relation", async () => {
      const deleteMock = relation.deleteMany as MockFn;

      await store.unlink(TEAM_ID, URI, "openbeam://tools/team_test/search");
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("relations", () => {
    it("returns outgoing relations", async () => {
      const findManyMock = relation.findMany as MockFn;
      findManyMock.mockReturnValue([
        {
          id: "rel_1",
          sourceUri: URI,
          targetUri: "openbeam://tools/team_test/search",
          teamId: TEAM_ID,
          reason: "uses",
          relationType: null,
          createdAt: new Date(),
        },
      ]);

      const result = await store.relations(TEAM_ID, URI);
      expect(result).toHaveLength(1);
      expect(result[0]?.sourceUri).toBe(URI);
    });
  });

  describe("touch", () => {
    it("increments hotness in Redis and DB", async () => {
      const updateManyMock = entry.updateMany as MockFn;
      updateManyMock.mockReturnValue(Promise.resolve({ count: 1 }));

      await store.touch(TEAM_ID, URI);

      expect(mockCache.incrementHotness).toHaveBeenCalledWith(TEAM_ID, URI);
    });
  });
});
