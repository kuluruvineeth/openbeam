import { describe, expect, it } from "bun:test";
import { createMockAgent } from "../../__tests__/test-helpers";
import { sortAgentsForDisplay } from "../agent-display-order";

describe("sortAgentsForDisplay", () => {
  it("orders agents by operational status priority", () => {
    const input = [
      createMockAgent({ agentId: "completed", status: "completed" }),
      createMockAgent({ agentId: "blocked", status: "blocked" }),
      createMockAgent({ agentId: "running", status: "running" }),
      createMockAgent({ agentId: "failed", status: "failed" }),
      createMockAgent({ agentId: "idle", status: "idle" }),
    ];

    const result = sortAgentsForDisplay(input);

    expect(result.map((agent) => agent.agentId)).toEqual([
      "running",
      "blocked",
      "failed",
      "idle",
      "completed",
    ]);
  });

  it("uses last activity descending as secondary sort key", () => {
    const input = [
      createMockAgent({
        agentId: "a",
        status: "running",
        lastActivityAt: 1000,
      }),
      createMockAgent({
        agentId: "b",
        status: "running",
        lastActivityAt: 2000,
      }),
    ];

    const result = sortAgentsForDisplay(input);

    expect(result.map((agent) => agent.agentId)).toEqual(["b", "a"]);
  });
});
