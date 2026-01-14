import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const storageSignedUrlTool = defineTool({
  name: "storage_signed_url",
  description: `Generate a time-limited signed URL for accessing a file in storage.

USE THIS WHEN:
- User wants to download or view a stored file
- User needs to share a file temporarily
- User requests a preview link for a document

RETURNS: A pre-signed URL that grants temporary access to the file.
URLs expire after the specified duration (default: 1 hour).`,
  category: "data",
  searchKeywords: ["storage", "download", "url", "share", "link"],
  requiredPermissions: ["storage:read"],

  parameters: z.object({
    key: z
      .string()
      .min(1)
      .describe("The storage key (file path) to generate URL for"),
    expiresIn: z
      .number()
      .min(60)
      .max(604_800)
      .optional()
      .default(3600)
      .describe(
        "URL expiration time in seconds (60s to 7 days, default: 1 hour)"
      ),
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
      return failure("NOT_FOUND", `File not found: ${params.key}`, {
        suggestion: "Use storage_list to browse available files",
      });
    }

    const signedUrl = await ctx.services.storage.getSignedUrl({
      teamId: ctx.teamId,
      key: params.key,
      expiresIn: params.expiresIn,
    });

    const expiresAt = new Date(
      Date.now() + (params.expiresIn ?? 3600) * 1000
    ).toISOString();

    return success({
      key: params.key,
      url: signedUrl,
      expiresAt,
      expiresInSeconds: params.expiresIn ?? 3600,
    });
  },
});
