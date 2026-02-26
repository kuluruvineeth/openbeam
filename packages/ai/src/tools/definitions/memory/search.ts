import { z } from "zod";
import type { LongTermMemory } from "../../../memory";
import { defineTool, failure, success } from "../../builder";
import { getLongTermMemory, setLongTermMemory } from "./deps";

export function setMemoryStore(store: LongTermMemory): void {
  setLongTermMemory(store);
}

export const searchMemoryTool = defineTool({
  name: "searchMemory",
  description: `Search through agent's long-term memory for relevant information.

USE THIS WHEN:
- You need to recall past conversations or decisions
- Looking for previously stored context about a topic
- Need to find information that was learned in previous sessions

DO NOT USE WHEN:
- Searching for current documents (use hybridSearch instead)
- Looking for real-time data from connected sources

HOW TO USE:
- Provide a natural language query describing what you're looking for
- Results are ranked by semantic relevance
- Memory entries include the original content and when they were stored`,

  category: "data",
  requiredPermissions: ["memory:read"],
  searchKeywords: [
    "memory",
    "recall",
    "remember",
    "past",
    "history",
    "context",
  ],

  parameters: z.object({
    query: z
      .string()
      .describe(
        "Natural language query to search memory for relevant information"
      ),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of memory entries to return (1-50)"),
  }),

  async execute(params, _ctx) {
    const memoryStore = getLongTermMemory();
    if (!memoryStore) {
      return failure(
        "INVALID_STATE",
        "Memory store not initialized. Call setMemoryStore before using this tool.",
        { suggestion: "Initialize the memory store in your application setup" }
      );
    }

    const limit = Math.min(Math.max(1, params.limit), 50);

    const results = await memoryStore.search(params.query, limit);

    return success({
      entries: results.map((r) => ({
        id: r.entry.id,
        content: r.entry.content,
        createdAt: new Date(r.entry.createdAt).toISOString(),
        relevanceScore: r.relevanceScore,
        metadata: r.entry.metadata,
      })),
      totalFound: results.length,
    });
  },
});
