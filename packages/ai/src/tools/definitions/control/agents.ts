import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlAgentListTool = defineTool({
  name: "control_agent_list",
  description: `List all control plane agents for the current team.

USE THIS WHEN:
- User asks about available agents, agent fleet, or what agents are running
- Need to check agent statuses or find a specific agent

DO NOT USE WHEN:
- Looking for AI assistant/chat agents (those are different)
- Need detailed config of a specific agent (use control_agent_get)

RETURNS: Array of agents with id, name, status, adapterType, and last heartbeat info.`,
  category: "control",
  parameters: z.object({
    status: z
      .enum(["ACTIVE", "PAUSED", "TERMINATED", "ERROR"])
      .optional()
      .describe("Filter by agent status"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .describe("Max results"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlAgents?.list({
      teamId: ctx.teamId,
      limit: params.limit,
    });
    return success({ agents: result });
  },
});

export const controlAgentGetTool = defineTool({
  name: "control_agent_get",
  description: `Get detailed information about a specific control plane agent.

USE THIS WHEN:
- Need agent configuration, runtime state, or budget details
- Checking if a specific agent is healthy

DO NOT USE WHEN:
- Want to list all agents (use control_agent_list)

RETURNS: Full agent details including config, adapter, runtime state, budget, and recent runs.`,
  category: "control",
  parameters: z.object({
    agentId: z.string().describe("The agent ID to look up"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const agent = await ctx.services.controlAgents?.get({
      teamId: ctx.teamId,
      agentId: params.agentId,
    });
    if (!agent) {
      return failure("NOT_FOUND", `Agent ${params.agentId} not found`);
    }
    return success(agent);
  },
});

export const controlAgentWakeTool = defineTool({
  name: "control_agent_wake",
  description: `Wake up (trigger) a control plane agent to run immediately.

USE THIS WHEN:
- Need an agent to execute a task right now
- Responding to an event that requires agent action

DO NOT USE WHEN:
- Agent is already running (check status first)
- Agent is terminated or in error state

RETURNS: Wakeup request ID and whether it was accepted.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    agentId: z.string().describe("The agent to wake"),
    reason: z.string().optional().describe("Why the agent is being woken"),
    payload: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Optional data to pass to the agent"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlAgents?.wake({
      teamId: ctx.teamId,
      agentId: params.agentId,
      reason: params.reason ?? "Manual wakeup",
      payload: params.payload,
    });
    return success(result);
  },
});

export function registerAgentTools() {
  controlAgentListTool.register();
  controlAgentGetTool.register();
  controlAgentWakeTool.register();
}
