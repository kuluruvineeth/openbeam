import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const contextBrowseTool = defineTool({
  name: "context_browse",
  description: `Browse the context database directory structure at a given openbeam:// URI.

USE THIS WHEN:
- Exploring available context directories before searching
- Navigating the hierarchical namespace to discover content
- Listing children of a specific context directory
- Understanding what memories, skills, or resources exist

DO NOT USE WHEN:
- Searching for specific content by query (use context_search)
- Reading a specific entry's content (use context_read)
- Listing virtual workspace files (use virtual_file_list)

NAMESPACE STRUCTURE:
- openbeam://session/{team}/{user}/{session}/ — Active conversations
- openbeam://user/{team}/{user}/memories/ — User knowledge
- openbeam://agent/{team}/{agent}/memories/ — Agent learned patterns
- openbeam://agent/{team}/{agent}/skills/ — Agent capabilities
- openbeam://resources/{team}/ — Synced enterprise data
- openbeam://tools/{team}/ — Tool definitions and stats`,
  category: "documents",
  searchKeywords: ["context", "browse", "list", "directory"],

  parameters: z.object({
    uri: z
      .string()
      .optional()
      .default("openbeam://")
      .describe("The openbeam:// URI to browse. Defaults to root namespace"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure(
        "UNAUTHORIZED",
        "Team context required for context browse"
      );
    }

    if (!ctx.services.contextDb) {
      return failure("INVALID_STATE", "Context database service not available");
    }

    const result = await ctx.services.contextDb.browse({
      uri: params.uri,
      teamId: ctx.teamId,
    });

    return success({
      uri: result.uri,
      children: result.children.map((child) => ({
        uri: child.uri,
        abstract: child.abstract,
        contextType: child.contextType,
        isLeaf: child.isLeaf,
        activeCount: child.activeCount,
      })),
      total: result.total,
    });
  },
});
