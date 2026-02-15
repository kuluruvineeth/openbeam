import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, success } from "../../builder";

export const missionEscalate = defineTool({
  name: "mission_escalate",
  description:
    "Escalate a task when the current agent lacks capabilities, context, or permissions to complete it safely.",
  category: "mission",
  stakes: "medium",
  reversibility: "easy",
  searchKeywords: ["mission", "escalate", "blocked", "supervisor", "handoff"],

  parameters: z.object({
    reason: z
      .string()
      .describe("Why the current task cannot be completed by this agent"),
    attemptedApproaches: z
      .array(z.string())
      .describe("Approaches attempted so far"),
    suggestedNextSteps: z
      .array(z.string())
      .describe("Recommended next actions for supervisor/operator"),
    urgency: z.enum(["low", "medium", "high"]).default("medium"),
  }),

  execute(params): Promise<
    ToolExecutionResult<{
      escalated: boolean;
      message: string;
      reason: string;
      urgency: "low" | "medium" | "high";
    }>
  > {
    return Promise.resolve(
      success({
        escalated: true,
        message: "Task escalated for supervisor review.",
        reason: params.reason,
        urgency: params.urgency,
      })
    );
  },
});
