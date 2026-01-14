import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const storageListTool = defineTool({
  name: "storage_list",
  description: `List files in team storage with optional prefix filtering.

USE THIS WHEN:
- User wants to browse uploaded files
- User needs to find a specific file by name pattern
- User wants to see storage contents before downloading

RETURNS: List of storage objects with keys, sizes, and modification dates.
Supports pagination via cursor for large result sets.`,
  category: "data",
  searchKeywords: ["storage", "files", "list", "browse", "s3"],
  requiredPermissions: ["storage:read"],

  parameters: z.object({
    prefix: z
      .string()
      .optional()
      .describe(
        "Filter to files starting with this prefix (e.g., 'documents/' or 'images/2024/')"
      ),
    limit: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .default(100)
      .describe("Maximum number of results to return (1-1000)"),
    cursor: z
      .string()
      .optional()
      .describe("Pagination cursor from previous response"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const result = await ctx.services.storage.list({
      teamId: ctx.teamId,
      prefix: params.prefix,
      limit: params.limit,
      cursor: params.cursor,
    });

    return success({
      objects: result.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        lastModified: obj.lastModified?.toISOString(),
      })),
      count: result.objects.length,
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor,
      commonPrefixes: result.commonPrefixes,
    });
  },
});
