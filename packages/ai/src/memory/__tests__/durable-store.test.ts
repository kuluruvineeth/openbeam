import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  createDurableMemoryStore,
  type DurableMemoryStore,
} from "../durable-store";

function createMockDb() {
  return {
    missionMemory: {
      findUnique: mock(() => Promise.resolve(null)),
      upsert: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      findMany: mock(() => Promise.resolve([])),
    },
  };
}

describe("DurableMemoryStore", () => {
  let db: ReturnType<typeof createMockDb>;
  let store: DurableMemoryStore;

  beforeEach(() => {
    db = createMockDb();
    store = createDurableMemoryStore(db as never);
  });

  describe("get", () => {
    it("returns value when record exists", async () => {
      db.missionMemory.findUnique.mockResolvedValue({
        value: { count: 5 },
      } as never);

      const result = await store.get("mission-1", "counter");

      expect(result).toEqual({ count: 5 });
      expect(db.missionMemory.findUnique).toHaveBeenCalledWith({
        where: {
          missionId_agentId_key_scope: {
            missionId: "mission-1",
            agentId: "",
            key: "counter",
            scope: "mission",
          },
        },
      });
    });

    it("returns null when record not found", async () => {
      db.missionMemory.findUnique.mockResolvedValue(null as never);

      const result = await store.get("mission-1", "missing");
      expect(result).toBeNull();
    });

    it("uses custom scope and agentId", async () => {
      db.missionMemory.findUnique.mockResolvedValue({ value: "data" } as never);

      await store.get("mission-1", "key", "agent", "agent-1");

      expect(db.missionMemory.findUnique).toHaveBeenCalledWith({
        where: {
          missionId_agentId_key_scope: {
            missionId: "mission-1",
            agentId: "agent-1",
            key: "key",
            scope: "agent",
          },
        },
      });
    });
  });

  describe("set", () => {
    it("upserts value with defaults", async () => {
      await store.set("mission-1", "key", "value");

      expect(db.missionMemory.upsert).toHaveBeenCalledWith({
        where: {
          missionId_agentId_key_scope: {
            missionId: "mission-1",
            agentId: "",
            key: "key",
            scope: "mission",
          },
        },
        create: {
          missionId: "mission-1",
          agentId: "",
          key: "key",
          scope: "mission",
          value: "value",
        },
        update: { value: "value" },
      });
    });

    it("upserts with custom scope and agentId", async () => {
      await store.set(
        "mission-1",
        "state",
        { active: true },
        "team",
        "agent-x"
      );

      const call = (
        db.missionMemory.upsert.mock.calls as unknown[][]
      )[0]?.[0] as {
        where: {
          missionId_agentId_key_scope: { scope: string; agentId: string };
        };
      };
      expect(call.where.missionId_agentId_key_scope.scope).toBe("team");
      expect(call.where.missionId_agentId_key_scope.agentId).toBe("agent-x");
    });
  });

  describe("delete", () => {
    it("returns true when record deleted", async () => {
      db.missionMemory.delete.mockResolvedValue({} as never);

      const result = await store.delete("mission-1", "key");
      expect(result).toBe(true);
    });

    it("returns false when record not found", async () => {
      db.missionMemory.delete.mockRejectedValue(
        new Error("Record not found") as never
      );

      const result = await store.delete("mission-1", "missing");
      expect(result).toBe(false);
    });
  });

  describe("search", () => {
    it("searches by missionId with defaults", async () => {
      db.missionMemory.findMany.mockResolvedValue([
        {
          key: "k1",
          value: "v1",
          scope: "mission",
          agentId: "",
          missionId: "m-1",
        },
      ] as never);

      const results = await store.search("m-1");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        key: "k1",
        value: "v1",
        scope: "mission",
        agentId: "",
        missionId: "m-1",
      });
      expect(db.missionMemory.findMany).toHaveBeenCalledWith({
        where: { missionId: "m-1" },
        take: 50,
        orderBy: { updatedAt: "desc" },
      });
    });

    it("filters by scope, agentId, and prefix", async () => {
      db.missionMemory.findMany.mockResolvedValue([] as never);

      await store.search("m-1", {
        scope: "agent",
        agentId: "agent-1",
        prefix: "state:",
        limit: 5,
      });

      expect(db.missionMemory.findMany).toHaveBeenCalledWith({
        where: {
          missionId: "m-1",
          scope: "agent",
          agentId: "agent-1",
          key: { startsWith: "state:" },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    });
  });
});
