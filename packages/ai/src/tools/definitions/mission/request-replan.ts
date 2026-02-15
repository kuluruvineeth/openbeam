import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, success } from "../../builder";

export const missionRequestReplan = defineTool({
  name: "mission_request_replan",
  description:
    "Request a strategy change when the current approach is failing and summarize why.",
  category: "mission",
  stakes: "medium",
  reversibility: "easy",
  searchKeywords: ["mission", "replan", "strategy", "stuck", "alternative"],

  parameters: z.object({
    currentApproachSummary: z
      .string()
      .describe("Summary of the current approach being attempted"),
    failureAnalysis: z
      .string()
      .describe("Why the current approach appears to be failing"),
    suggestedAlternative: z
      .string()
      .optional()
      .describe("Optional candidate alternative strategy"),
  }),

  execute(params): Promise<
    ToolExecutionResult<{
      acknowledged: boolean;
      message: string;
      failureAnalysis: string;
      suggestedAlternative?: string;
    }>
  > {
    return Promise.resolve(
      success({
        acknowledged: true,
        message:
          "Replan request recorded. A revised strategy should be generated before continuing.",
        failureAnalysis: params.failureAnalysis,
        suggestedAlternative: params.suggestedAlternative,
      })
    );
  },
});
