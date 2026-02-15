import { describe, expect, it } from "bun:test";
import { createMockAgent } from "../../__tests__/test-helpers";
import {
  buildSpecialistSections,
  partitionAgentsForTree,
} from "../agent-panel-layout";

describe("buildSpecialistSections", () => {
  it("groups specialists into running, reflecting, blocked, spawned, and done buckets", () => {
    const sections = buildSpecialistSections([
      createMockAgent({ agentId: "a-running", status: "running" }),
      createMockAgent({
        agentId: "a-reflecting",
        status: "running",
        isReflecting: true,
      }),
      createMockAgent({ agentId: "a-blocked", status: "blocked" }),
      createMockAgent({ agentId: "a-failed", status: "failed" }),
      createMockAgent({
        agentId: "a-spawned",
        status: "running",
        spawnedBy: "a-running",
      }),
      createMockAgent({
        agentId: "a-spawned-done",
        status: "completed",
        spawnedBy: "a-running",
      }),
      createMockAgent({ agentId: "a-idle", status: "idle" }),
    ]);

    expect(sections.map((section) => section.key)).toEqual([
      "running",
      "reflecting",
      "blocked",
      "spawned",
      "done",
    ]);

    expect(sections[0]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-running",
    ]);
    expect(sections[1]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-reflecting",
    ]);
    expect(sections[2]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-blocked",
      "a-failed",
    ]);
    expect(sections[3]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-spawned",
      "a-spawned-done",
    ]);
    expect(sections[4]?.agents.map((agent) => agent.agentId)).toEqual([
      "a-idle",
    ]);
  });

  it("returns empty groups when specialists are absent", () => {
    const sections = buildSpecialistSections([]);

    expect(sections).toHaveLength(5);
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
