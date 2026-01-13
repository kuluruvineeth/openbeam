import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const docShareTool = defineTool({
  name: "doc_share",
  description: `Create a shareable link for a document.

USE THIS WHEN:
- User explicitly asks "Share this document" or "Create a share link"
- User wants to share document findings with colleagues
- User needs a temporary access link for external stakeholders
- User wants to enable quick access to a specific document

DO NOT USE WHEN:
- User wants to export document to a file (use doc_export)
- User just wants to read the document (use doc_get)
- User wants to share search results (share via export instead)

IMPORTANT: This creates a time-limited shareable link. Recipients can view but not edit. For sensitive documents, consider shorter expiration times.

RETURNS: Shareable URL with configurable expiration time.`,
  category: "documents",
  deferLoading: true,
  searchKeywords: ["share", "link", "send", "collaborate", "access"],
  requiredPermissions: ["documents:read", "documents:share"],

  parameters: z.object({
    documentId: z
      .string()
      .describe(
        "The document ID to share. Obtain from search results or doc_list."
      ),
    expiresInHours: z
      .number()
      .min(1)
      .max(168)
      .optional()
      .default(24)
      .describe(
        "Link expiration time in hours (1-168, default: 24). Use shorter times for sensitive content."
      ),
    allowDownload: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Allow recipients to download the document. Disabled by default for security."
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    if (!ctx.userId) {
      return failure(
        "UNAUTHORIZED",
        "User context required to create share links"
      );
    }

    const document = await ctx.services.documents.get(params.documentId);
    if (!document) {
      return failure("NOT_FOUND", `Document ${params.documentId} not found`);
    }

    if (document.teamId !== ctx.teamId) {
      return failure("FORBIDDEN", "Document belongs to a different team");
    }

    const result = await ctx.services.documents.share({
      documentId: params.documentId,
      teamId: ctx.teamId,
      userId: ctx.userId,
      expiresInHours: params.expiresInHours,
    });

    const expiresAt = result.expiresAt
      ? result.expiresAt.toISOString()
      : new Date(
          Date.now() + (params.expiresInHours ?? 24) * 60 * 60 * 1000
        ).toISOString();

    return success(
      {
        shareId: result.shareId,
        shareUrl: result.shareUrl,
        expiresAt,
        expiresInHours: params.expiresInHours ?? 24,
        document: {
          id: document.id,
          title: document.title,
          source: document.connectorType,
        },
        allowDownload: params.allowDownload ?? false,
        message: `Share link created for "${document.title}"`,
      },
      { latencyMs: performance.now() - startTime, source: "share-service" }
    );
  },
});
