import { describe, expect, it } from "bun:test";
import { createMockAgent } from "../../__tests__/test-helpers";
import {
  buildSpecialistSections,
  partitionAgentsForTree,
} from "../agent-panel-layout";

describe("buildSpecialistSections", () => {
  it("groups specialists into running, blocked, and done buckets", () => {
    const sections = buildSpecialistSections([
      createMockAgent({ agentId: "a-running", status: "running" }),
      createMockAgent({ agentId: "a-blocked", status: "blocked" }),
      createMockAgent({ agentId: "a-failed", status: "failed" }),
      createMockAgent({ agentId: "a-completed", status: "completed" }),
      createMockAgent({ agentId: "a-idle", status: "idle" }),
    ]);

    expect(sections.map((section) => section.key)).toEqual([
      "running",
      "blocked",
      "done",
    ]);

    expect(sections[0]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-running",
    ]);
    expect(sections[1]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-blocked",
      "a-failed",
    ]);
    expect(sections[2]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-completed",
      "a-idle",
    ]);
  });

  it("returns empty groups when specialists are absent", () => {
    const sections = buildSpecialistSections([]);

    expect(sections).toHaveLength(3);
    expect(sections.every((section) => section.agents.length === 0)).toBe(true);
  });
});

describe("partitionAgentsForTree", () => {
  it("splits coordinators from specialists and preserves sorted ordering", () => {
    const agents = [
      createMockAgent({
        agentId: "lead-1",
        role: "coordinator",
        status: "running",
        lastActivityAt: 200,
      }),
      createMockAgent({
        agentId: "specialist-1",
        role: "researcher",
        status: "blocked",
        lastActivityAt: 100,
      }),
      createMockAgent({
        agentId: "lead-2",
        role: "coordinator",
        status: "idle",
        lastActivityAt: 400,
      }),
    ];

    const result = partitionAgentsForTree(agents);

    expect(result.leads.map((agent) => agent.agentId)).toEqual([
      "lead-1",
      "lead-2",
    ]);
    expect(result.specialists.map((agent) => agent.agentId)).toEqual([
      "specialist-1",
    ]);
  });
});
