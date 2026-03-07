import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlProjectListTool = defineTool({
  name: "control_project_list",
  description: `List control plane projects.

USE THIS WHEN:
- Need to see available projects
- Looking for project context or structure

RETURNS: Array of projects with name, status, and agent assignments.`,
  category: "control",
  parameters: z.object({
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
    const result = await ctx.services.controlProjects?.list({
      teamId: ctx.teamId,
      limit: params.limit,
    });
    return success({ projects: result });
  },
});

export function registerProjectTools() {
  controlProjectListTool.register();
}
