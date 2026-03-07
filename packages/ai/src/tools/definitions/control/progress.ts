import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlEvaluateProgressTool = defineTool({
  name: "control_evaluate_progress",
  description: `Self-evaluate progress on the current task or issue.

USE THIS WHEN:
- Periodically checking if work is on track
- Before completing a task, to verify all acceptance criteria are met
- Determining if the agent should continue, pivot, or escalate
- Recording progress for visibility and accountability

DO NOT USE WHEN:
- Simply updating issue status (use control_issue_update instead)
- Adding a progress comment (use control_issue_comment instead)

RETURNS: Structured progress evaluation with completion percentage and blockers.`,
  category: "control",
  parameters: z.object({
    issueId: z.string().optional().describe("Issue being worked on"),
    completionPercent: z
      .number()
      .min(0)
      .max(100)
      .describe("Estimated completion percentage"),
    summary: z
      .string()
      .min(1)
      .describe("Summary of what has been accomplished"),
    remainingWork: z
      .array(z.string())
      .optional()
      .describe("List of remaining work items"),
    blockers: z
      .array(z.string())
      .optional()
      .describe("Current blockers preventing progress"),
    confidence: z
      .enum(["HIGH", "MEDIUM", "LOW"])
      .optional()
      .default("MEDIUM")
      .describe("Confidence in completing on time"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const evaluation = await ctx.services.controlProgress?.evaluate({
      teamId: ctx.teamId,
      agentId: ctx.metadata?.agentId as string | undefined,
      ...params,
    });
    return success(evaluation);
  },
});

export const controlRequestReplanTool = defineTool({
  name: "control_request_replan",
  description: `Request replanning of the current task when the original approach is not viable.

USE THIS WHEN:
- Discovered the original approach won't work
- Requirements changed mid-execution
- Encountered unexpected complexity requiring a different strategy
- Blockers make the current plan infeasible

DO NOT USE WHEN:
- Minor adjustments suffice (just continue working)
- Need human input (use control_escalate instead)
- The task should be cancelled (update issue status instead)

RETURNS: Replan request ID with the new plan proposal.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    issueId: z.string().optional().describe("Issue that needs replanning"),
    currentPlan: z.string().describe("Description of the current plan"),
    reason: z.string().describe("Why replanning is needed"),
    proposedPlan: z.string().describe("Proposed new plan"),
    estimatedImpact: z
      .enum(["NONE", "MINOR", "MODERATE", "MAJOR"])
      .optional()
      .default("MODERATE")
      .describe("Impact on timeline and scope"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlProgress?.replan({
      teamId: ctx.teamId,
      agentId: ctx.metadata?.agentId as string | undefined,
      ...params,
    });
    return success(result);
  },
});

export function registerProgressTools() {
  controlEvaluateProgressTool.register();
  controlRequestReplanTool.register();
}
