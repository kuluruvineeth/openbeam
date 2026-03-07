import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlCostRecordTool = defineTool({
  name: "control_cost_record",
  description: `Record a cost entry for an agent execution.

USE THIS WHEN:
- Agent completed work that incurred costs (LLM tokens, API calls)
- Need to track spending against budget

RETURNS: The recorded cost entry.`,
  category: "control",
  parameters: z.object({
    agentId: z.string().describe("Agent that incurred the cost"),
    runId: z.string().optional().describe("Associated run ID"),
    provider: z
      .string()
      .describe("Cost provider (e.g., 'anthropic', 'openai')"),
    model: z.string().optional().describe("Model used"),
    inputTokens: z.number().optional().describe("Input tokens consumed"),
    outputTokens: z.number().optional().describe("Output tokens consumed"),
    costCents: z.number().describe("Cost in cents"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const entry = await ctx.services.controlCosts?.record({
      teamId: ctx.teamId,
      ...params,
    });
    return success(entry);
  },
});

export const controlCostQueryTool = defineTool({
  name: "control_cost_query",
  description: `Query cost data for agents.

USE THIS WHEN:
- Need to check spending against budget
- Analyzing cost trends or per-agent costs

RETURNS: Cost summary with total, breakdown by agent/provider, and budget status.`,
  category: "control",
  parameters: z.object({
    agentId: z.string().optional().describe("Filter by agent"),
    periodDays: z
      .number()
      .optional()
      .default(30)
      .describe("Lookback period in days"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlCosts?.query({
      teamId: ctx.teamId,
      ...params,
    });
    return success(result);
  },
});

export function registerCostTools() {
  controlCostRecordTool.register();
  controlCostQueryTool.register();
}
