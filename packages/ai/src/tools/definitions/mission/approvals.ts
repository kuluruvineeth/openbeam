import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, success } from "../../builder";
import { getMissionContext, getMissionServices } from "./memory";

export const missionRequestApproval = defineTool({
  name: "mission_request_approval",
  description:
    "Request human approval before executing a high-risk action. Use this when an action could have significant consequences that warrant human review before proceeding.",
  category: "mission",
  stakes: "high",
  reversibility: "irreversible",
  searchKeywords: ["approval", "permission", "authorize", "confirm", "risk"],

  parameters: z.object({
    intent: z
      .string()
      .describe(
        "What the agent wants to do, described clearly for human review"
      ),
    riskLevel: z
      .enum(["low", "medium", "high", "critical"])
      .describe("Assessed risk level of the proposed action"),
    toolName: z
      .string()
      .describe("Name of the tool that needs approval to execute"),
    toolParams: z
      .record(z.string(), z.unknown())
      .describe("Parameters for the tool that needs approval"),
    riskFactors: z
      .array(z.string())
      .optional()
      .describe("Specific risk factors identified for this action"),
  }),

  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ approvalId: string; status: "pending" }>> {
    const services = getMissionServices();
    const mCtx = getMissionContext(ctx);

    const result = await services.requestApproval({
      missionId: mCtx.missionId,
      runId: mCtx.runId,
      agentId: mCtx.agentId,
      intent: params.intent,
      riskLevel: params.riskLevel,
      toolName: params.toolName,
      toolParams: params.toolParams,
      riskFactors: params.riskFactors,
    });

    return success({
      approvalId: result.approvalId,
      status: "pending" as const,
    });
  },
});
