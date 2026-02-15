import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, success } from "../../builder";

const CONFIDENCE_TO_SCORE: Record<"high" | "medium" | "low", number> = {
  high: 0.8,
  medium: 0.5,
  low: 0.2,
};

export const missionEvaluateProgress = defineTool({
  name: "mission_evaluate_progress",
  description:
    "Self-evaluate progress on the current task to determine whether to continue, replan, or escalate.",
  category: "mission",
  stakes: "medium",
  reversibility: "easy",
  searchKeywords: [
    "mission",
    "self-evaluation",
    "progress",
    "reflection",
    "replan",
  ],

  parameters: z.object({
    assessment: z
      .string()
      .describe("Concise assessment of current progress and output quality"),
    blockers: z
      .array(z.string())
      .optional()
      .describe("Blockers encountered during execution"),
    confidenceLevel: z
      .enum(["high", "medium", "low"])
      .describe("Confidence in succeeding with the current approach"),
  }),

  execute(params): Promise<
    ToolExecutionResult<{
      selfAssessment: string;
      progressScore: number;
      blockers: string[];
      recommendation: "continue" | "replan";
    }>
  > {
    const progressScore = CONFIDENCE_TO_SCORE[params.confidenceLevel];
    const recommendation: "continue" | "replan" =
      progressScore < 0.3 ? "replan" : "continue";

    return Promise.resolve(
      success({
        selfAssessment: params.assessment,
        progressScore,
        blockers: params.blockers ?? [],
        recommendation,
      })
    );
  },
});
