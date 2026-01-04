import { z } from "zod";
import { analyzeQuery } from "../../../rag/query-analyzer";
import { defineTool, success } from "../../builder";

export const pureQueryAnalyzeTool = defineTool({
  name: "analyze_query",
  description: `Analyze a user query to understand intent, extract entities, and identify temporal context.
Returns structured analysis including query intent, entities, keywords, and context requirements.
Use to understand queries before retrieval or to optimize search parameters.`,
  category: "analysis",
  deferLoading: false,
  searchKeywords: [
    "analyze",
    "intent",
    "decompose",
    "query",
    "understand",
    "entities",
    "keywords",
  ],

  parameters: z.object({
    query: z.string().min(1).describe("The query to analyze"),
    conversationHistory: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
          timestamp: z.number(),
        })
      )
      .optional()
      .describe("Previous conversation turns for context"),
  }),

  execute(params, _ctx) {
    const startTime = performance.now();

    const conversationContext = params.conversationHistory
      ? {
          conversationId: "inline",
          turns: params.conversationHistory.map((t) => ({
            role: t.role,
            content: t.content,
            timestamp: t.timestamp,
          })),
          summary: null,
          entities: new Map(),
          topicShift: false,
        }
      : undefined;

    const analysis = analyzeQuery(params.query, conversationContext);

    let complexity: "simple" | "moderate" | "complex" = "simple";
    if (analysis.keywords.length > 5 || analysis.entities.length > 2) {
      complexity = "complex";
    } else if (analysis.keywords.length > 2) {
      complexity = "moderate";
    }

    return Promise.resolve(
      success(
        {
          originalQuery: analysis.originalQuery,
          normalizedQuery: analysis.normalizedQuery,
          intent: analysis.intent,
          entities: analysis.entities.map((e) => ({
            text: e.text,
            type: e.type,
            confidence: e.confidence,
            normalized: e.normalized,
          })),
          keywords: analysis.keywords,
          subQueries: analysis.subQueries,
          temporalContext: analysis.temporalContext
            ? {
                type: analysis.temporalContext.type,
                description: analysis.temporalContext.description,
                start: analysis.temporalContext.start?.toISOString(),
                end: analysis.temporalContext.end?.toISOString(),
              }
            : null,
          requiresContext: analysis.requiresContext,
          confidence: analysis.confidence,
          complexity,
        },
        {
          latencyMs: performance.now() - startTime,
          source: "pure-query-analyzer",
        }
      )
    );
  },
});
