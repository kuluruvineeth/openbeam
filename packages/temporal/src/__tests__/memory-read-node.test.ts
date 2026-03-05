import { describe, expect, it } from "vitest";
import { createMemoryReadNodeActivity } from "../activities/canvas/memory-read-node";

function createMockDb() {
  return {};
}

describe("memoryReadNode", () => {
  it("returns default value when memory is empty (pending AgentMemory migration)", async () => {
    const db = createMockDb();
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
      defaultValue: 0,
    });

    expect(result).toEqual({
      key: "counter",
      value: 0,
      found: false,
    });
  });

  it("throws when throwOnMissing is true", async () => {
    const db = createMockDb();
    const activity = createMemoryReadNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryReadNodeActivity
      >[0]["db"],
    });

    await expect(
      activity({
        executionId: "exec-1",
        teamId: "team-1",
        key: "missing",
        scope: "workflow",
        throwOnMissing: true,
      })
    ).rejects.toThrow('Memory key "missing" not found');
  });
});
