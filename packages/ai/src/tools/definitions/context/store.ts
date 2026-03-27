import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const contextStoreTool = defineTool({
  name: "context_store",
  description: `Store a new context entry in the hierarchical context database.

USE THIS WHEN:
- Persisting learned patterns, cases, or skills for future agent sessions
- Storing user preferences or entity knowledge extracted from conversations
- Saving tool execution insights or workflow optimizations
- Creating resources in the openbeam:// namespace

DO NOT USE WHEN:
- Storing temporary session data (use workspace_write)
- Storing simple key-value memories (use memory_store)
- Syncing documents from connectors (handled by sync workflows)

The entry will be assigned a URI, and L0/L1 summaries will be generated asynchronously.`,
  category: "data",
  stakes: "medium",
  reversibility: "easy",
  requiredPermissions: ["context:write"],
  searchKeywords: ["context", "store", "save", "write"],

  parameters: z.object({
    content: z
      .string()
      .min(1)
      .describe("The full content to store as an L2 context entry"),
    contextType: z
      .enum(["resource", "memory", "skill", "tool"])
      .describe("Type of context entry"),
    category: z
      .string()
      .optional()
      .describe(
        "Sub-category within the type. Examples: 'preferences', 'entities', 'cases', 'patterns'"
      ),
    uri: z
      .string()
      .optional()
      .describe(
        "Explicit openbeam:// URI. If omitted, one will be generated based on type and category"
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required for context store");
    }

    if (!ctx.services.contextDb) {
      return failure("INVALID_STATE", "Context database service not available");
    }

    const result = await ctx.services.contextDb.store({
      teamId: ctx.teamId,
      ownerId: ctx.userId,
      ownerType: "user",
      content: params.content,
      contextType: params.contextType,
      category: params.category,
      uri: params.uri,
    });

    return success({
      id: result.id,
      uri: result.uri,
      abstract: result.abstract,
      stored: result.stored,
    });
  },
});
