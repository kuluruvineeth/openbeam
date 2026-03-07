import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlApprovalListTool = defineTool({
  name: "control_approval_list",
  description: `List pending approval requests.

USE THIS WHEN:
- Checking for approvals that need response
- Reviewing approval queue

RETURNS: Array of pending approvals with requester, action, and expiry.`,
  category: "control",
  parameters: z.object({
    status: z
      .enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"])
      .optional()
      .default("PENDING")
      .describe("Filter by status"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .describe("Max results"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlApprovals?.list({
      teamId: ctx.teamId,
      ...params,
    });
    return success({ approvals: result });
  },
});

export const controlApprovalRequestTool = defineTool({
  name: "control_approval_request",
  description: `Create an approval request for a sensitive action.

USE THIS WHEN:
- About to perform a high-stakes operation
- Need human or supervisor approval before proceeding

RETURNS: The created approval request with ID and status.`,
  category: "control",
  stakes: "high",
  parameters: z.object({
    action: z.string().describe("Description of the action needing approval"),
    reason: z.string().describe("Why this action is needed"),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional context"),
    expiresInMinutes: z
      .number()
      .optional()
      .default(60)
      .describe("Minutes before the request expires"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const approval = await ctx.services.controlApprovals?.request({
      teamId: ctx.teamId,
      ...params,
    });
    return success(approval);
  },
});

export const controlApprovalRespondTool = defineTool({
  name: "control_approval_respond",
  description: `Respond to an approval request (approve or reject).

USE THIS WHEN:
- Reviewing and deciding on a pending approval
- Agent has authority to approve/reject the action

DO NOT USE WHEN:
- Approval is expired or already responded to

RETURNS: The updated approval with response status.`,
  category: "control",
  stakes: "high",
  parameters: z.object({
    approvalId: z.string().describe("Approval request ID"),
    approved: z
      .boolean()
      .describe("Whether to approve (true) or reject (false)"),
    comment: z.string().optional().describe("Optional response comment"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlApprovals?.respond({
      teamId: ctx.teamId,
      ...params,
    });
    if (!result) {
      return failure("NOT_FOUND", `Approval ${params.approvalId} not found`);
    }
    return success(result);
  },
});

export function registerApprovalTools() {
  controlApprovalListTool.register();
  controlApprovalRequestTool.register();
  controlApprovalRespondTool.register();
}
