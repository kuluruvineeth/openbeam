import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlMessageTool = defineTool({
  name: "control_message",
  description: `Send a message to another control plane agent via issue comment or wakeup payload.

USE THIS WHEN:
- Need to communicate findings, status, or requests to another agent
- Sharing context or results with a collaborating agent
- Providing feedback on delegated work

DO NOT USE WHEN:
- Need the agent to perform work (use control_agent_delegate instead)
- Reporting to humans (use control_escalate instead)
- The message is about an issue (use control_issue_comment instead)

RETURNS: Confirmation that the message was delivered.`,
  category: "control",
  parameters: z.object({
    targetAgentId: z.string().describe("ID of the agent to message"),
    message: z.string().min(1).describe("The message content"),
    issueId: z
      .string()
      .optional()
      .describe("If set, posts as an issue comment instead of a wakeup"),
    wakeTarget: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to wake the target agent after sending"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    if (params.issueId) {
      const comment = await ctx.services.controlIssues?.comment({
        teamId: ctx.teamId,
        issueId: params.issueId,
        body: params.message,
      });
      return success({
        delivered: true,
        method: "issue_comment",
        referenceId: comment.id,
      });
    }

    if (params.wakeTarget) {
      const result = await ctx.services.controlAgents?.wake({
        teamId: ctx.teamId,
        agentId: params.targetAgentId,
        reason: "Message from agent",
        payload: {
          type: "message",
          from: ctx.metadata?.agentId,
          body: params.message,
        },
      });
      return success({
        delivered: true,
        method: "wakeup",
        referenceId: result.requestId,
      });
    }

    const comment = await ctx.services.controlIssues?.comment({
      teamId: ctx.teamId,
      issueId: params.targetAgentId,
      body: `@${params.targetAgentId} ${params.message}`,
    });
    return success({
      delivered: true,
      method: "mention",
      referenceId: comment.id,
    });
  },
});

export const controlEscalateTool = defineTool({
  name: "control_escalate",
  description: `Escalate an issue or decision to a manager agent or human reviewer.

USE THIS WHEN:
- Current agent lacks authority or capability to proceed
- A decision requires human judgment
- Risk level exceeds agent's approval threshold
- Stuck on a problem and need guidance

DO NOT USE WHEN:
- Can resolve the issue independently
- Another peer agent can help (use control_agent_delegate)
- Already have an open escalation for the same issue

RETURNS: Approval request ID for tracking the escalation.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    subject: z.string().min(1).describe("What is being escalated"),
    reason: z.string().min(1).describe("Why escalation is needed"),
    issueId: z.string().optional().describe("Related issue ID"),
    severity: z
      .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
      .optional()
      .default("MEDIUM")
      .describe("Escalation severity"),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional context for the reviewer"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const approval = await ctx.services.controlApprovals?.request({
      teamId: ctx.teamId,
      action: `Escalation: ${params.subject}`,
      reason: params.reason,
      metadata: {
        type: "ESCALATION",
        severity: params.severity,
        issueId: params.issueId,
        escalatedBy: ctx.metadata?.agentId,
        ...params.context,
      },
    });
    return success({
      escalationId: approval.id,
      status: approval.status,
      subject: params.subject,
    });
  },
});

export function registerCommunicationTools() {
  controlMessageTool.register();
  controlEscalateTool.register();
}
