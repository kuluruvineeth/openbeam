import { describe, expect, it, vi } from "vitest";
import { createMemoryWriteNodeActivity } from "../activities/canvas/memory-write-node";

function createMockDb() {
  return {
    missionMemory: {
      upsert: vi.fn(),
    },
  };
}

describe("memoryWriteNode", () => {
  it("writes to workflow scope using missionMemory", async () => {
    const db = createMockDb();
    const activity = createMemoryWriteNodeActivity({ db: db as any });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      key: "counter",
      value: 42,
      scope: "workflow",
    });

    expect(result).toEqual({
      key: "counter",
      scope: "workflow",
      written: true,
    });
    expect(db.missionMemory.upsert).toHaveBeenCalledWith({
      where: {
        missionId_agentId_key_scope: {
          missionId: "exec-1",
          agentId: "",
          key: "counter",
          scope: "workflow",
        },
      },
      create: {
        missionId: "exec-1",
        agentId: "",
        key: "counter",
        scope: "workflow",
        value: 42,
      },
      update: { value: 42 },
    });
  });

  it("writes to mission scope with explicit missionId", async () => {
    const db = createMockDb();
    const activity = createMemoryWriteNodeActivity({ db: db as any });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      missionId: "mission-1",
      agentId: "agent-1",
      key: "findings",
      value: { items: ["a", "b"] },
      scope: "mission",
    });

    expect(result).toEqual({
      key: "findings",
      scope: "mission",
      written: true,
    });
    expect(db.missionMemory.upsert).toHaveBeenCalledWith({
      where: {
        missionId_agentId_key_scope: {
          missionId: "mission-1",
          agentId: "agent-1",
          key: "findings",
          scope: "mission",
        },
      },
      create: {
        missionId: "mission-1",
        agentId: "agent-1",
        key: "findings",
        scope: "mission",
        value: { items: ["a", "b"] },
      },
      update: { value: { items: ["a", "b"] } },
    });
  });

  it("falls back to executionId when missionId absent", async () => {
    const db = createMockDb();
    const activity = createMemoryWriteNodeActivity({ db: db as any });

    await activity({
      executionId: "exec-fallback",
      teamId: "team-1",
      key: "state",
      value: "active",
      scope: "agent",
    });

    expect(db.missionMemory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          missionId_agentId_key_scope: expect.objectContaining({
            missionId: "exec-fallback",
            agentId: "",
          }),
        },
      })
    );
  });

  it("writes to team scope", async () => {
    const db = createMockDb();
    const activity = createMemoryWriteNodeActivity({ db: db as any });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      missionId: "mission-1",
      key: "team-config",
      value: { threshold: 0.5 },
      scope: "team",
    });

    expect(result.scope).toBe("team");
    expect(result.written).toBe(true);
    expect(db.missionMemory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          missionId_agentId_key_scope: expect.objectContaining({
            scope: "team",
          }),
        },
      })
    );
  });
});
