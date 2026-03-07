import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlGoalListTool = defineTool({
  name: "control_goal_list",
  description: `List goals/objectives for the team.

USE THIS WHEN:
- Need to understand team priorities
- Looking for goals to work toward

RETURNS: Array of goals with progress, target, and status.`,
  category: "control",
  parameters: z.object({
    status: z
      .enum(["ACTIVE", "COMPLETED", "PAUSED"])
      .optional()
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
    const result = await ctx.services.controlGoals?.list({
      teamId: ctx.teamId,
      ...params,
    });
    return success({ goals: result });
  },
});

export const controlGoalGetTool = defineTool({
  name: "control_goal_get",
  description: `Get detailed information about a specific goal.

USE THIS WHEN:
- Need goal details, milestones, or linked issues

RETURNS: Full goal details with milestones and progress breakdown.`,
  category: "control",
  parameters: z.object({
    goalId: z.string().describe("Goal ID to look up"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const goal = await ctx.services.controlGoals?.get({
      teamId: ctx.teamId,
      goalId: params.goalId,
    });
    if (!goal) {
      return failure("NOT_FOUND", `Goal ${params.goalId} not found`);
    }
    return success(goal);
  },
});

export function registerGoalTools() {
  controlGoalListTool.register();
  controlGoalGetTool.register();
}
