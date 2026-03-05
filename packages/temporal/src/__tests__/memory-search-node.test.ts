import { describe, expect, it } from "vitest";
import { createMemorySearchNodeActivity } from "../activities/canvas/memory-search-node";

describe("memorySearchNode (stubbed pending AgentMemory model)", () => {
  it("returns empty results for keyword search", async () => {
    const activity = createMemorySearchNodeActivity({ db: {} as never });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      query: "counter",
      mode: "keyword",
      scope: "workflow",
    });

    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("returns empty results for prefix search", async () => {
    const activity = createMemorySearchNodeActivity({ db: {} as never });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      query: "state:",
      mode: "prefix",
      scope: "agent",
    });

    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("accepts optional agentId and topK", async () => {
    const activity = createMemorySearchNodeActivity({ db: {} as never });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      agentId: "agent-1",
      query: "finding",
      mode: "keyword",
      scope: "team",
      topK: 5,
    });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });
});
