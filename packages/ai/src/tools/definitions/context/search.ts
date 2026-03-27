import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const contextSearchTool = defineTool({
  name: "context_search",
  description: `Search the hierarchical context database for memories, resources, skills, and tools.

USE THIS WHEN:
- Finding previously stored context, memories, or learned patterns
- Searching for agent skills, tool execution history, or user preferences
- Locating resources across the openbeam:// namespace
- Querying accumulated knowledge from past sessions

DO NOT USE WHEN:
- Searching current documents from connected sources (use search_hybrid)
- Looking for a specific context entry by URI (use context_read)
- Browsing directory structure (use context_browse)

RETURNS: Ranked list of context entries with relevance scores, URIs, and abstracts.`,
  category: "search",
  searchKeywords: ["context", "memory", "knowledge", "find"],

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe("Natural language search query for context retrieval"),
    scope: z
      .string()
      .optional()
      .describe(
        "URI prefix to scope the search. Example: 'openbeam://user/' or 'openbeam://agent/'"
      ),
    contextType: z
      .enum(["resource", "memory", "skill", "tool"])
      .optional()
      .describe("Filter by context entry type"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of results (1-50)"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure(
        "UNAUTHORIZED",
        "Team context required for context search"
      );
    }

    if (!ctx.services.contextDb) {
      return failure("INVALID_STATE", "Context database service not available");
    }

    const result = await ctx.services.contextDb.search({
      query: params.query,
      teamId: ctx.teamId,
      scope: params.scope,
      contextType: params.contextType,
      limit: params.limit,
    });

    return success(
      {
        entries: result.entries,
        total: result.total,
        query: params.query,
      },
      { latencyMs: result.queryTime, source: "context-db" }
    );
  },
});
