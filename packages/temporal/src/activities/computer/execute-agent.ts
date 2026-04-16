import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  connectMcpPair,
  executeAgent,
  executeProposedActions,
  persistSteps,
} from "@openbeam/computer";
import type { Database } from "@openbeam/db";
import {
  getComputerAgentById,
  getUserTimezone,
  updateComputerRun,
} from "@openbeam/db";
import type { ExecuteAgentResult } from "@openbeam/types/computer";

export interface ExecuteAgentDeps {
  db: Database;
  createMcpServer: (
    teamId: string,
    userId: string,
    timezone: string | null
  ) => McpServer;
}

export function createExecuteAgentActivities(deps: ExecuteAgentDeps) {
  return {
    async executeComputerAgent(input: {
      agentId: string;
      teamId: string;
      runId: string;
      triggerType?: string;
      parameters?: Record<string, unknown>;
    }): Promise<ExecuteAgentResult> {
      const agent = await getComputerAgentById(deps.db, input.agentId);
      if (!agent) {
        throw new Error("agent_not_found");
      }

      const timezone = await getUserTimezone(deps.db, agent.createdBy ?? "");
      const mcpServer = deps.createMcpServer(
        input.teamId,
        agent.createdBy ?? "",
        timezone
      );
      const mcp = await connectMcpPair(mcpServer);

      try {
        const result = await executeAgent({
          db: deps.db,
          teamId: input.teamId,
          userId: agent.createdBy ?? "",
          agentId: agent.id,
          agentName: agent.name,
          agentSlug: agent.slug,
          runId: input.runId,
          code: agent.code,
          mcpClient: mcp.client,
          timezone,
          triggerContext: {
            type: input.triggerType ?? "manual",
            ...input.parameters,
          },
        });

        await persistSteps(deps.db, input.runId, result.steps);
        return result;
      } finally {
        await mcp.close();
      }
    },

    async replayApprovedActions(input: {
      runId: string;
      agentId: string;
      teamId: string;
      actions: Array<{
        tool: string;
        args: Record<string, unknown>;
        description?: string;
      }>;
    }): Promise<ExecuteAgentResult> {
      const agent = await getComputerAgentById(deps.db, input.agentId);
      if (!agent) {
        throw new Error("agent_not_found");
      }

      await updateComputerRun(deps.db, input.runId, { status: "RUNNING" });

      const mcpServer = deps.createMcpServer(
        input.teamId,
        agent.createdBy ?? "",
        null
      );
      const mcp = await connectMcpPair(mcpServer);

      try {
        const result = await executeProposedActions({
          mcpClient: mcp.client,
          runId: input.runId,
          actions: input.actions,
        });

        await persistSteps(deps.db, input.runId, result.steps);
        return result;
      } finally {
        await mcp.close();
      }
    },
  };
}

export type ExecuteAgentActivities = ReturnType<
  typeof createExecuteAgentActivities
>;
