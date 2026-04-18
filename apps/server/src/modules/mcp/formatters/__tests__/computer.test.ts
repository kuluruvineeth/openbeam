import { describe, expect, it } from "bun:test";
import {
  formatComputerAgentEnabled,
  formatComputerAgents,
  formatComputerCatalog,
  formatComputerConfirmed,
  formatComputerGenerated,
  formatComputerRuns,
  formatComputerRunTriggered,
} from "../computer";

describe("formatComputerCatalog", () => {
  it("returns empty message for empty catalog", () => {
    expect(formatComputerCatalog([])).toBe("No pre-built agents available.");
  });

  it("formats catalog entries with name, templateId, description, schedule", () => {
    const output = formatComputerCatalog([
      {
        templateId: "knowledge-digest",
        name: "Knowledge Digest",
        slug: "knowledge-digest",
        description: "Weekly summary",
        scheduleCron: "0 8 * * 1",
      },
    ]);

    expect(output).toContain("Knowledge Digest (knowledge-digest)");
    expect(output).toContain("Weekly summary");
    expect(output).toContain("Schedule: 0 8 * * 1");
    expect(output).toContain("computer_agent_enable");
  });

  it("omits schedule line for on-demand agents", () => {
    const output = formatComputerCatalog([
      {
        templateId: "onboarding",
        name: "Onboarding Curator",
        slug: "onboarding",
        description: "On-demand",
        scheduleCron: null,
      },
    ]);

    expect(output).not.toContain("Schedule:");
  });

  it("uses singular for one agent", () => {
    const output = formatComputerCatalog([
      {
        templateId: "a",
        name: "A",
        slug: "a",
        description: "x",
        scheduleCron: null,
      },
    ]);

    expect(output).toContain("1 pre-built agent");
    expect(output).not.toContain("pre-built agents");
  });
});

describe("formatComputerAgents", () => {
  it("returns onboarding message for empty list", () => {
    const output = formatComputerAgents([]);
    expect(output).toContain("No agents enabled yet");
    expect(output).toContain("computer_catalog_list");
    expect(output).toContain("computer_agent_generate");
  });

  it("formats agents with status, mode, id, schedule", () => {
    const output = formatComputerAgents([
      {
        id: "agent_123",
        name: "Knowledge Digest",
        slug: "kd",
        description: null,
        status: "ACTIVE",
        mode: "AUTONOMOUS",
        scheduleCron: "0 8 * * 1",
        createdAt: new Date(),
      },
    ]);

    expect(output).toContain("[active]");
    expect(output).toContain("(autonomous)");
    expect(output).toContain("ID: agent_123");
    expect(output).toContain("Schedule: 0 8 * * 1");
  });

  it("shows manual schedule for null cron", () => {
    const output = formatComputerAgents([
      {
        id: "agent_1",
        name: "A",
        slug: "a",
        description: null,
        status: "DRAFT",
        mode: "APPROVAL",
        scheduleCron: null,
        createdAt: new Date(),
      },
    ]);

    expect(output).toContain("Schedule: manual");
  });
});

describe("formatComputerRuns", () => {
  it("suggests trigger command when no runs", () => {
    const output = formatComputerRuns("agent_abc", []);
    expect(output).toContain("No runs yet");
    expect(output).toContain('agentId "agent_abc"');
  });

  it("formats runs with status, tool count, and summary", () => {
    const output = formatComputerRuns("agent_abc", [
      {
        id: "run_1",
        status: "COMPLETED",
        summary: "Found 3 stale docs",
        error: null,
        toolCallCount: 5,
        llmCallCount: 2,
        startedAt: null,
        completedAt: new Date().toISOString(),
        createdAt: new Date(),
      },
    ]);

    expect(output).toContain("completed");
    expect(output).toContain("5 tools");
    expect(output).toContain("Found 3 stale docs");
  });

  it("truncates long summaries at 80 chars", () => {
    const longSummary = "x".repeat(200);
    const output = formatComputerRuns("agent_abc", [
      {
        id: "run_1",
        status: "COMPLETED",
        summary: longSummary,
        error: null,
        toolCallCount: 0,
        llmCallCount: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
      },
    ]);

    expect(output).toContain("...");
    expect(output).not.toContain("x".repeat(100));
  });

  it("falls back to error when summary is null", () => {
    const output = formatComputerRuns("agent_abc", [
      {
        id: "run_1",
        status: "FAILED",
        summary: null,
        error: "rate_limited",
        toolCallCount: 1,
        llmCallCount: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
      },
    ]);

    expect(output).toContain("rate_limited");
  });
});

describe("formatComputerRunTriggered", () => {
  it("includes the run ID and next-step guidance", () => {
    const output = formatComputerRunTriggered("run_xyz");
    expect(output).toContain("run_xyz");
    expect(output).toContain("computer_agent_runs");
  });
});

describe("formatComputerAgentEnabled", () => {
  it("confirms with name, id, and next steps", () => {
    const output = formatComputerAgentEnabled({
      name: "Knowledge Digest",
      id: "agent_abc",
      status: "ACTIVE",
    });

    expect(output).toContain('"Knowledge Digest"');
    expect(output).toContain("agent_abc");
    expect(output).toContain("active");
    expect(output).toContain("computer_agent_run");
  });
});

describe("formatComputerGenerated", () => {
  it("includes plan with numbered steps and deployment warning", () => {
    const output = formatComputerGenerated({
      name: "Health Monitor",
      slug: "health-monitor",
      description: "Checks connectors",
      scheduleCron: "0 */6 * * *",
      plan: ["Fetch connectors", "Check health", "Notify"],
      toolsUsed: ["connector_list", "connector_health"],
    });

    expect(output).toContain("Health Monitor");
    expect(output).toContain("Schedule: 0 */6 * * *");
    expect(output).toContain("1. Fetch connectors");
    expect(output).toContain("2. Check health");
    expect(output).toContain("3. Notify");
    expect(output).toContain("connector_list");
    expect(output).toContain("Do NOT deploy without user confirmation");
  });

  it("shows on-demand for null schedule", () => {
    const output = formatComputerGenerated({
      name: "X",
      slug: "x",
      description: "y",
      scheduleCron: null,
      plan: [],
      toolsUsed: [],
    });

    expect(output).toContain("Schedule: on-demand");
  });
});

describe("formatComputerConfirmed", () => {
  it("confirms deployment with agent id and run command", () => {
    const output = formatComputerConfirmed({
      name: "Custom Agent",
      id: "agent_new",
    });

    expect(output).toContain('"Custom Agent"');
    expect(output).toContain("agent_new");
    expect(output).toContain("computer_agent_run");
  });
});
