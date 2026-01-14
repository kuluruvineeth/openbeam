import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const storageExistsTool = defineTool({
  name: "storage_exists",
  description: `Check if a file exists in team storage.

USE THIS WHEN:
- Validating a file path before download
- Checking if an upload completed successfully
- Verifying file availability before sharing

RETURNS: Boolean indicating whether the file exists, plus metadata if found.`,
  category: "data",
  searchKeywords: ["storage", "exists", "check", "validate", "file"],
  requiredPermissions: ["storage:read"],

  parameters: z.object({
    key: z.string().min(1).describe("The storage key (file path) to check"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const exists = await ctx.services.storage.exists({
      teamId: ctx.teamId,
      key: params.key,
    });

    if (!exists) {
      return success({
        key: params.key,
        exists: false,
      });
    }

    const metadata = await ctx.services.storage.getMetadata({
      teamId: ctx.teamId,
      key: params.key,
    });

    return success({
      key: params.key,
      exists: true,
      size: metadata?.size,
      lastModified: metadata?.lastModified?.toISOString(),
    });
  },
});
