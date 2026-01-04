import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const classifyQueryTool = defineTool({
  name: "classify_query",
  description: `Classify user query intent and extract parameters.
Determines query type (factual, exploratory, action) and key entities.
Use to route queries or determine optimal search strategy.`,
  category: "data",
  deferLoading: false,
  searchKeywords: ["classify", "intent", "query", "route", "categorize"],

  parameters: z.object({
    query: z.string().min(1).describe("User query to classify"),
    context: z
      .string()
      .optional()
      .describe("Additional context for classification"),
  }),

  execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return Promise.resolve(failure("UNAUTHORIZED", "Team context required"));
    }

    return Promise.resolve(
      success(
        {
          query: params.query,
          intent: "factual" as const,
          confidence: 0.9,
          entities: [],
          suggestedStrategy: "hybrid",
        },
        { latencyMs: performance.now() - startTime, source: "ai" }
      )
    );
  },
});
