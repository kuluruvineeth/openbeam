import { describe, expect, it } from "vitest";
import { createMemoryWriteNodeActivity } from "../activities/canvas/memory-write-node";

function createMockDb() {
  return {};
}

describe("memoryWriteNode", () => {
  it("returns not-written stub (pending AgentMemory migration)", async () => {
    const db = createMockDb();
    const activity = createMemoryWriteNodeActivity({
      db: db as unknown as Parameters<
        typeof createMemoryWriteNodeActivity
      >[0]["db"],
    });

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
      written: false,
    });
  });
});
