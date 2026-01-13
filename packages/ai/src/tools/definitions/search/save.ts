import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchSaveTool = defineTool({
  name: "search_save",
  description: `Save a search query for quick reuse later.

USE THIS WHEN:
- User explicitly asks "Save this search" or "Bookmark this query"
- User has a frequent or complex search they want to reuse
- User wants to create a named shortcut for a search pattern
- User is building a collection of useful searches

DO NOT USE WHEN:
- User just wants to run a search (use search_hybrid)
- User wants to export results to a file (use search_export)
- User wants a one-time search without saving

RETURNS: Saved search ID and name for future reference. Saved searches appear in the user's search library.`,
  category: "search",
  deferLoading: true,
  searchKeywords: ["save", "bookmark", "remember", "store", "favorite"],
  requiredPermissions: ["search:read", "search:write"],

  parameters: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .describe(
        "A descriptive name for the saved search. Examples: 'Q4 Reports', 'Engineering Docs', 'John's Projects'"
      ),
    query: z.string().min(1).describe("The search query to save."),
    filters: z
      .object({
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe("Connector types to include in saved search."),
        dateRange: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional()
          .describe(
            "Date range filter (will be saved as relative if possible)."
          ),
      })
      .optional()
      .describe("Optional filters to save with the search."),
    description: z
      .string()
      .max(500)
      .optional()
      .describe("Optional description of what this search is for."),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    if (!ctx.userId) {
      return failure("UNAUTHORIZED", "User context required to save searches");
    }

    const result = await ctx.services.search.save({
      teamId: ctx.teamId,
      userId: ctx.userId,
      name: params.name,
      query: params.query,
      filters: params.filters as Record<string, unknown> | undefined,
    });

    return success(
      {
        savedSearchId: result.savedSearchId,
        name: result.name,
        query: params.query,
        hasFilters: !!params.filters,
        message: `Search saved as "${result.name}"`,
      },
      { latencyMs: performance.now() - startTime, source: "database" }
    );
  },
});
