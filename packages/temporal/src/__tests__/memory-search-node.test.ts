import { describe, expect, it, vi } from "vitest";
import { createMemorySearchNodeActivity } from "../activities/canvas/memory-search-node";

function createMockDb() {
  return {
    missionMemory: {
      findMany: vi.fn((): Promise<unknown[]> => Promise.resolve([])),
    },
  };
}

describe("memorySearchNode", () => {
  it("searches with keyword mode", async () => {
    const db = createMockDb();
    db.missionMemory.findMany.mockResolvedValue([
      { key: "counter_a", value: 1, scope: "workflow", updatedAt: new Date() },
      { key: "counter_b", value: 2, scope: "workflow", updatedAt: new Date() },
    ]);

    const activity = createMemorySearchNodeActivity({ db: db as any });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      query: "counter",
      mode: "keyword",
      scope: "workflow",
    });

    expect(result.results).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.results[0]).toEqual({
      key: "counter_a",
      value: 1,
      scope: "workflow",
    });
    expect(db.missionMemory.findMany).toHaveBeenCalledWith({
      where: {
        missionId: "exec-1",
        key: { contains: "counter" },
        scope: "workflow",
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });
  });

  it("searches with prefix mode", async () => {
    const db = createMockDb();
    db.missionMemory.findMany.mockResolvedValue([
      {
        key: "state:active",
        value: true,
        scope: "workflow",
        updatedAt: new Date(),
      },
    ]);

    const activity = createMemorySearchNodeActivity({ db: db as any });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      query: "state:",
      mode: "prefix",
      scope: "workflow",
    });

    expect(result.results).toHaveLength(1);
    expect(db.missionMemory.findMany).toHaveBeenCalledWith({
      where: {
        missionId: "exec-1",
        key: { startsWith: "state:" },
        scope: "workflow",
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });
  });

  it("searches mission scope with agentId filter", async () => {
    const db = createMockDb();
    db.missionMemory.findMany.mockResolvedValue([
      {
        key: "finding:1",
        value: "result-a",
        scope: "mission",
        updatedAt: new Date(),
      },
    ]);

    const activity = createMemorySearchNodeActivity({ db: db as any });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      missionId: "mission-1",
      agentId: "agent-1",
      query: "finding",
      mode: "keyword",
      scope: "mission",
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      key: "finding:1",
      value: "result-a",
      scope: "mission",
    });
    expect(db.missionMemory.findMany).toHaveBeenCalledWith({
      where: {
        missionId: "mission-1",
        key: { contains: "finding" },
        scope: "mission",
        agentId: "agent-1",
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });
  });

  it("respects topK parameter", async () => {
    const db = createMockDb();

    const activity = createMemorySearchNodeActivity({ db: db as any });

    await activity({
      executionId: "exec-1",
      teamId: "team-1",
      query: "test",
      mode: "keyword",
      scope: "workflow",
      topK: 5,
    });

    expect(db.missionMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it("falls back to executionId as missionId", async () => {
    const db = createMockDb();

    const activity = createMemorySearchNodeActivity({ db: db as any });

    await activity({
      executionId: "exec-fallback",
      teamId: "team-1",
      query: "test",
      mode: "keyword",
    });

    expect(db.missionMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          missionId: "exec-fallback",
        }),
      })
    );
  });

  it("searches agent scope with prefix mode", async () => {
    const db = createMockDb();
    db.missionMemory.findMany.mockResolvedValue([
      {
        key: "agent:state",
        value: "idle",
        scope: "agent",
        updatedAt: new Date(),
      },
    ]);

    const activity = createMemorySearchNodeActivity({ db: db as any });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      missionId: "mission-1",
      query: "agent",
      mode: "prefix",
      scope: "agent",
    });

    expect(result.results[0]?.scope).toBe("agent");
    expect(db.missionMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          key: { startsWith: "agent" },
          scope: "agent",
        }),
      })
    );
  });
});
