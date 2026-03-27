import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const contextReadTool = defineTool({
  name: "context_read",
  description: `Read a context entry at a specific openbeam:// URI with tiered detail level.

USE THIS WHEN:
- Reading a known context entry by URI after finding it via context_search or context_browse
- Loading progressively more detail (L0 abstract → L1 overview → L2 full content)
- Inspecting a specific memory, skill, resource, or tool definition

DO NOT USE WHEN:
- Searching for context entries (use context_search)
- Browsing directory listings (use context_browse)
- Reading documents from connectors (use doc_get)

LEVELS:
- L0: One-sentence abstract (~100 tokens) — for ranking and quick scanning
- L1: Core info with navigation (~2K tokens) — default, good for understanding
- L2: Full original content (unbounded) — for deep inspection`,
  category: "documents",
  searchKeywords: ["context", "read", "get", "uri"],

  parameters: z.object({
    uri: z
      .string()
      .min(1)
      .describe(
        "The openbeam:// URI to read. Example: 'openbeam://user/team1/user1/memories/preferences/'"
      ),
    level: z
      .enum(["L0", "L1", "L2"])
      .optional()
      .default("L1")
      .describe(
        "Detail level: L0 (abstract), L1 (overview), L2 (full content)"
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required for context read");
    }

    if (!ctx.services.contextDb) {
      return failure("INVALID_STATE", "Context database service not available");
    }

    const entry = await ctx.services.contextDb.read({
      uri: params.uri,
      teamId: ctx.teamId,
      level: params.level,
    });

    if (!entry) {
      return failure(
        "NOT_FOUND",
        `No context entry found at URI: ${params.uri}`
      );
    }

    return success({
      uri: entry.uri,
      parentUri: entry.parentUri,
      contextType: entry.contextType,
      category: entry.category,
      isLeaf: entry.isLeaf,
      abstract: entry.abstract,
      overview: params.level !== "L0" ? entry.overview : undefined,
      content: params.level === "L2" ? entry.content : undefined,
      activeCount: entry.activeCount,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      level: params.level,
    });
  },
});
