import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, success } from "../../builder";
import { getMissionContext, getMissionServices } from "./memory";

const ARTIFACT_TYPE = z
  .enum(["document", "report", "code", "data", "image", "other"])
  .describe("The type of artifact being created");

export const missionCreateArtifact = defineTool({
  name: "mission_create_artifact",
  description:
    "Create an output artifact such as a document, report, code snippet, or dataset. Artifacts are the deliverables of a mission and persist beyond the execution run.",
  category: "mission",
  stakes: "medium",
  reversibility: "hard",
  searchKeywords: ["mission", "artifact", "create", "output", "deliverable"],

  parameters: z.object({
    title: z.string().describe("Title of the artifact"),
    type: ARTIFACT_TYPE,
    content: z
      .unknown()
      .describe("The artifact content (object, string, or structured data)"),
    url: z
      .string()
      .optional()
      .describe("Optional URL reference associated with the artifact"),
  }),

  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ artifactId: string; created: boolean }>> {
    const services = getMissionServices();
    const mCtx = getMissionContext(ctx);

    const result = await services.createArtifact({
      missionId: mCtx.missionId,
      runId: mCtx.runId,
      title: params.title,
      type: params.type,
      content: params.content,
      url: params.url,
    });

    return success({ artifactId: result.artifactId, created: true });
  },
});
