import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const SubQuerySchema = z.object({
  query: z.string().describe("The sub-query text"),
  intent: z.enum(["original", "expanded", "related", "temporal", "entity"]),
  weight: z.number().min(0).max(1),
});

export type SubQuery = z.infer<typeof SubQuerySchema>;

export const overviewFanoutTool = defineTool({
  name: "overview_fanout",
  description: `Decompose a user query into multiple focused sub-queries for comprehensive search coverage.

USE THIS WHEN:
- Building AI overviews that need to cover multiple aspects of a topic
- Query is broad and would benefit from multiple targeted searches
- Need to capture different perspectives or time ranges

RETURNS: Array of sub-queries with intent classification and importance weights.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["fanout", "decompose", "subquery", "expand"],

  parameters: z.object({
    query: z.string().min(1).describe("The original user query to decompose"),
    maxSubQueries: z
      .number()
      .min(2)
      .max(5)
      .optional()
      .default(3)
      .describe("Maximum number of sub-queries to generate"),
  }),

  execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required for fanout");
    }

    const startTime = performance.now();
    const analysis = ctx.services.rag.analyzeQuery(params.query);

    const subQueries: SubQuery[] = [
      {
        query: analysis.normalizedQuery,
        intent: "original",
        weight: 1.0,
      },
    ];

    if (analysis.entities.length > 0) {
      const entityQuery = analysis.entities
        .slice(0, 3)
        .map((e) => e.text)
        .join(" ");
      subQueries.push({
        query: entityQuery,
        intent: "entity",
        weight: 0.8,
      });
    }

    if (analysis.searchTerms.length > 3) {
      const expandedQuery = analysis.searchTerms.slice(0, 5).join(" ");
      subQueries.push({
        query: expandedQuery,
        intent: "expanded",
        weight: 0.7,
      });
    }

    if (analysis.temporal?.type) {
      const temporalQuery = `${analysis.normalizedQuery} ${analysis.temporal.type}`;
      subQueries.push({
        query: temporalQuery,
        intent: "temporal",
        weight: 0.6,
      });
    }

    const finalSubQueries = subQueries.slice(0, params.maxSubQueries);
    const complexity = getQueryComplexity(analysis.searchTerms.length);

    return success(
      {
        originalQuery: params.query,
        subQueries: finalSubQueries,
        analysis: {
          intent: analysis.intent,
          entities: analysis.entities.map((e) => ({
            text: e.text,
            type: e.type,
          })),
          complexity,
        },
      },
      {
        latencyMs: performance.now() - startTime,
        source: "fanout",
      }
    );
  },
});

function getQueryComplexity(
  termCount: number
): "simple" | "moderate" | "complex" {
  if (termCount > 5) {
    return "complex";
  }
  if (termCount > 2) {
    return "moderate";
  }
  return "simple";
}
