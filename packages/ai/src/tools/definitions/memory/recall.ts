import { z } from "zod";
import type { PersistentMemory } from "../../../memory/persistent";
import { defineTool, failure, success } from "../../builder";
import { getPersistentMemory, setPersistentMemory } from "./deps";

export function setPersistentMemoryForRecall(store: PersistentMemory): void {
  setPersistentMemory(store);
}

export const memoryRecallTool = defineTool({
  name: "memory_recall",
  description: `Search persistent memory for previously stored information using hybrid semantic + keyword search.

USE THIS WHEN:
- Recalling past conversations, decisions, or learned facts
- Looking for context that was stored in previous sessions
- Checking if specific information was previously remembered
- Finding all memories related to a topic

DO NOT USE WHEN:
- Searching current documents from connected sources (use search_hybrid)
- Looking for real-time data
- Accessing session-specific temporary state (use getSessionState)

HOW TO USE:
- Provide a natural language query describing what you want to recall
- Optionally filter by tags or date range
- Results are ranked by combined semantic and keyword relevance`,

  category: "data",
  requiredPermissions: ["memory:read"],
  searchKeywords: [
    "memory",
    "recall",
    "remember",
    "search",
    "find",
    "retrieve",
    "past",
  ],

  parameters: z.object({
    query: z.string().describe("Natural language query to search memory"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Filter results by these tags"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of results to return (1-50)"),
    minRelevance: z
      .number()
      .optional()
      .default(0.3)
      .describe("Minimum relevance score threshold (0-1)"),
  }),

  async execute(params, ctx) {
    const persistentMemory = getPersistentMemory();
    if (!persistentMemory) {
      return failure(
        "INVALID_STATE",
        "Persistent memory not initialized. Call setPersistentMemoryForRecall before using this tool.",
        { suggestion: "Initialize persistent memory in your application setup" }
      );
    }

    const limit = Math.min(Math.max(1, params.limit), 50);
    const minRelevance = Math.min(Math.max(0, params.minRelevance), 1);

    const results = await persistentMemory.recall({
      query: params.query,
      teamId: ctx.teamId,
      tags: params.tags,
      limit,
      minRelevance,
    });

    return success({
      entries: results.map((r) => ({
        id: r.entry.id,
        content: r.entry.content,
        tags: r.entry.tags,
        importance: r.entry.importance,
        relevanceScore: r.relevanceScore,
        matchType: r.matchType,
        createdAt: new Date(r.entry.createdAt).toISOString(),
        accessCount: r.entry.accessCount,
      })),
      totalFound: results.length,
      query: params.query,
    });
  },
});
