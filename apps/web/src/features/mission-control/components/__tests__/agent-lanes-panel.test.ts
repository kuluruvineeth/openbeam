import { describe, expect, it } from "bun:test";
import { createMockAgent } from "../../__tests__/test-helpers";
import { summarizeAgentStatuses } from "../../lib/agent-status-summary";

describe("summarizeAgentStatuses", () => {
  it("counts base statuses plus spawned and reflecting agents", () => {
    const agents = [
      createMockAgent({ status: "running" }),
      createMockAgent({ agentId: "a-2", status: "running" }),
      createMockAgent({ agentId: "a-3", status: "blocked" }),
      createMockAgent({ agentId: "a-4", status: "completed" }),
      createMockAgent({ agentId: "a-5", status: "failed" }),
      createMockAgent({
        agentId: "a-6",
        status: "idle",
        spawnedBy: "a-1",
        isReflecting: true,
      }),
    ];

    const result = summarizeAgentStatuses(agents);

    expect(result).toEqual({
      running: 2,
      blocked: 1,
      completed: 1,
      failed: 1,
      idle: 1,
      spawned: 1,
      reflecting: 1,
    });
  });
});
