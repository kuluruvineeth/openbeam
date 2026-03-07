import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlArtifactCreateTool = defineTool({
  name: "control_artifact_create",
  description: `Create and publish an artifact (deliverable) from agent work.

USE THIS WHEN:
- Agent produced a report, analysis, or document that should be shared
- Generated code, configuration, or data that needs to be stored
- Completed a task with output that stakeholders should review

DO NOT USE WHEN:
- Writing to agent memory (use control_memory_write instead)
- Updating team knowledge (use control_knowledge_store instead)
- Adding a comment to an issue (use control_issue_comment instead)

RETURNS: The created artifact with its ID and storage location.`,
  category: "control",
  stakes: "low",
  parameters: z.object({
    title: z.string().min(1).max(200).describe("Artifact title"),
    contentType: z
      .enum(["text/markdown", "text/plain", "application/json", "text/csv"])
      .describe("MIME type of the artifact content"),
    content: z.string().min(1).describe("The artifact content"),
    issueId: z.string().optional().describe("Issue to attach the artifact to"),
    projectId: z.string().optional().describe("Project to associate with"),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional metadata"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const artifact = await ctx.services.controlArtifacts?.create({
      teamId: ctx.teamId,
      agentId: ctx.metadata?.agentId as string | undefined,
      ...params,
    });
    return success(artifact);
  },
});

export function registerArtifactTools() {
  controlArtifactCreateTool.register();
}
