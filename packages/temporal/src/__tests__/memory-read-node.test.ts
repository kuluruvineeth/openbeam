import { describe, expect, it, vi } from "vitest";
import { createMemoryReadNodeActivity } from "../activities/canvas/memory-read-node";

function createMockDb() {
  return {
    missionMemory: {
      findUnique: vi.fn(),
    },
  };
}

describe("memoryReadNode", () => {
  it("reads from workflow scope", async () => {
    const db = createMockDb();
    db.missionMemory.findUnique.mockResolvedValue({
      key: "counter",
      value: 42,
    });

    const activity = createMemoryReadNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryReadNodeActivity
      >[0]["db"],
    });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      key: "counter",
      scope: "workflow",
    });

    expect(result).toEqual({ key: "counter", value: 42, found: true });
    expect(db.missionMemory.findUnique).toHaveBeenCalledWith({
      where: {
        missionId_agentId_key_scope: {
          missionId: "exec-1",
          agentId: "",
          key: "counter",
          scope: "workflow",
        },
      },
    });
  });

  it("reads from mission scope with explicit missionId", async () => {
    const db = createMockDb();
    db.missionMemory.findUnique.mockResolvedValue({
      key: "findings",
      value: ["a", "b"],
      scope: "mission",
    });

    const activity = createMemoryReadNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryReadNodeActivity
      >[0]["db"],
    });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      missionId: "mission-1",
      agentId: "agent-1",
      key: "findings",
      scope: "mission",
    });

    expect(result).toEqual({ key: "findings", value: ["a", "b"], found: true });
    expect(db.missionMemory.findUnique).toHaveBeenCalledWith({
      where: {
        missionId_agentId_key_scope: {
          missionId: "mission-1",
          agentId: "agent-1",
          key: "findings",
          scope: "mission",
        },
      },
    });
  });

  it("returns default value when key not found", async () => {
    const db = createMockDb();
    db.missionMemory.findUnique.mockResolvedValue(null);

    const activity = createMemoryReadNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryReadNodeActivity
      >[0]["db"],
    });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      key: "missing",
      scope: "workflow",
      defaultValue: "fallback",
    });

    expect(result).toEqual({ key: "missing", value: "fallback", found: false });
  });

  it("returns null when key not found and no default", async () => {
    const db = createMockDb();
    db.missionMemory.findUnique.mockResolvedValue(null);

    const activity = createMemoryReadNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryReadNodeActivity
      >[0]["db"],
    });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      key: "missing",
      scope: "workflow",
    });

    expect(result).toEqual({ key: "missing", value: null, found: false });
  });

  it("throws when throwOnMissing is set and key not found", async () => {
    const db = createMockDb();
    db.missionMemory.findUnique.mockResolvedValue(null);

    const activity = createMemoryReadNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryReadNodeActivity
      >[0]["db"],
    });

    await expect(
      activity({
        executionId: "exec-1",
        teamId: "team-1",
        key: "required-key",
        scope: "workflow",
        throwOnMissing: true,
      })
    ).rejects.toThrow(
      'Memory key "required-key" not found in scope "workflow"'
    );
  });

  it("falls back to executionId as missionId", async () => {
    const db = createMockDb();
    db.missionMemory.findUnique.mockResolvedValue(null);

    const activity = createMemoryReadNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryReadNodeActivity
      >[0]["db"],
    });

    await activity({
      executionId: "exec-fallback",
      teamId: "team-1",
      key: "key1",
      scope: "agent",
    });

    expect(db.missionMemory.findUnique).toHaveBeenCalledWith({
      where: {
        missionId_agentId_key_scope: {
          missionId: "exec-fallback",
          agentId: "",
          key: "key1",
          scope: "agent",
        },
      },
    });
  });
});
