import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlAgentSpawnTool = defineTool({
  name: "control_agent_spawn",
  description: `Request creation of a new control plane agent. Requires approval from a manager or human.

USE THIS WHEN:
- Current workload requires a specialized agent that doesn't exist yet
- A task needs capabilities not available in the current agent fleet
- Scaling up by adding more workers for a project

DO NOT USE WHEN:
- An existing agent can handle the work (use control_agent_delegate instead)
- The task is within current agent's capabilities
- Budget constraints prevent new agent creation

RETURNS: Approval request ID. The agent is not created until the request is approved.`,
  category: "control",
  stakes: "high",
  parameters: z.object({
    name: z.string().min(1).max(100).describe("Name for the new agent"),
    role: z
      .string()
      .min(1)
      .max(200)
      .describe("Role description (e.g., 'frontend-engineer', 'qa-tester')"),
    adapterType: z
      .enum(["CLAUDE_LOCAL", "CODEX_LOCAL", "PROCESS", "HTTP"])
      .describe("Execution adapter type"),
    reason: z.string().min(1).describe("Why this agent is needed"),
    capabilities: z
      .array(z.string())
      .optional()
      .describe("Requested capabilities for the new agent"),
    reportsTo: z
      .string()
      .optional()
      .describe("Agent ID this new agent should report to"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    if (!ctx.services.controlApprovals) {
      return failure(
        "INVALID_STATE",
        "Control approvals service not available"
      );
    }
    const approval = await ctx.services.controlApprovals.request({
      teamId: ctx.teamId,
      action: `Spawn agent: ${params.name} (${params.role})`,
      reason: params.reason,
      metadata: {
        type: "AGENT_SPAWN",
        agentName: params.name,
        agentRole: params.role,
        adapterType: params.adapterType,
        capabilities: params.capabilities,
        reportsTo: params.reportsTo,
      },
    });
    return success({
      approvalId: approval.id,
      status: approval.status,
      agentName: params.name,
    });
  },
});

export const controlAgentDelegateTool = defineTool({
  name: "control_agent_delegate",
  description: `Delegate work to another control plane agent by waking it with a task.

USE THIS WHEN:
- Another agent is better suited for a specific subtask
- Distributing work across the agent fleet
- Need parallel execution by multiple agents

DO NOT USE WHEN:
- Target agent is terminated or in error state (check with control_agent_get first)
- The work should be tracked as an issue (create an issue and assign it instead)

RETURNS: Wakeup request confirmation with the delegated task details.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    agentId: z.string().describe("ID of the agent to delegate to"),
    task: z.string().min(1).describe("Description of the delegated task"),
    issueId: z
      .string()
      .optional()
      .describe("Issue ID to associate with the delegation"),
    priority: z
      .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
      .optional()
      .default("MEDIUM")
      .describe("Task priority"),
    payload: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional data the delegate agent needs"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    if (!ctx.services.controlAgents) {
      return failure("INVALID_STATE", "Control agents service not available");
    }
    const result = await ctx.services.controlAgents.wake({
      teamId: ctx.teamId,
      agentId: params.agentId,
      reason: `Delegated task: ${params.task}`,
      payload: {
        delegatedBy: ctx.metadata?.agentId,
        task: params.task,
        issueId: params.issueId,
        priority: params.priority,
        ...params.payload,
      },
    });
    return success({
      ...result,
      delegatedTo: params.agentId,
      task: params.task,
    });
  },
});

export function registerDelegationTools() {
  controlAgentSpawnTool.register();
  controlAgentDelegateTool.register();
}
