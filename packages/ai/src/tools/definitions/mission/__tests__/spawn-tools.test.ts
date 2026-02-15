import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { z } from "zod";
import { defineTool, success } from "../../../builder";
import { toolRegistry } from "../../../registry";
import { createUnimplementedServices } from "../../../services";
import type { ToolContext } from "../../../types";
import { missionQueryCapabilities } from "../query-capabilities";
import { missionSpawnAgent, setMissionSpawnServices } from "../spawn-agent";

const context: ToolContext = {
  teamId: "team-1",
  userId: "user-1",
  services: createUnimplementedServices(),
  metadata: {
    missionId: "mission-1",
    agentId: "agent-1",
    runId: "run-1",
  },
};

describe("missionSpawnAgent", () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("submits spawn request with mission context", async () => {
    const requestAgentSpawn = mock(
      async (input: {
        missionId: string;
        requestId: string;
        requestingAgentId: string;
        taskDescription: string;
        requiredCapabilities: string[];
      }) => ({
        requestId: input.requestId,
        delivered: true,
      })
    );

    setMissionSpawnServices({
      requestAgentSpawn,
      getMissionAgents: async () => ({ agents: [] }),
      getSpawnTree: async () => ({ entries: [] }),
    });

    const result = await missionSpawnAgent.execute(
      {
        taskDescription:
          "Investigate regression in mission dispatch and produce fix guidance",
        requiredCapabilities: ["research", "analysis"],
        priority: "P1",
        maxSteps: 8,
        budgetCentsLimit: 40,
      },
      context
    );

    expect(result.success).toBe(true);
    expect(requestAgentSpawn).toHaveBeenCalledTimes(1);
    expect(requestAgentSpawn).toHaveBeenCalledWith(
      expect.objectContaining({
        missionId: "mission-1",
        requestingAgentId: "agent-1",
        requiredCapabilities: ["research", "analysis"],
      })
    );
  });
});

describe("missionQueryCapabilities", () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("returns filtered mission agents and available tools", async () => {
    const catalogTool = defineTool({
      name: "analysis_tool",
      description: "Analyze mission artifacts",
      category: "data",
      parameters: z.object({}),
      execute: async () => success({ ok: true }),
    });
    catalogTool.register();

    setMissionSpawnServices({
      requestAgentSpawn: async (input) => ({
        requestId: input.requestId,
        delivered: true,
      }),
      getSpawnTree: async () => ({ entries: [] }),
      getMissionAgents: async () => ({
        agents: [
          {
            id: "a1",
            name: "Research Specialist",
            role: "Research",
            level: "specialist",
            capabilities: ["research"],
            tools: ["search_hybrid"],
          },
          {
            id: "a2",
            name: "Writer Specialist",
            role: "Writing",
            level: "spawned",
            capabilities: ["writing"],
            tools: ["mission_write_memory"],
          },
        ],
      }),
    });

    const result = await missionQueryCapabilities.execute(
      {
        capabilityFilter: "write",
        includeAvailableTools: true,
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.agentCount).toBe(1);
    expect(result.data?.missionAgents[0]?.id).toBe("a2");
    expect(result.data?.availableToolCount).toBeGreaterThanOrEqual(0);
  });
});
