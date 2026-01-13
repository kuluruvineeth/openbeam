import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const docExportTool = defineTool({
  name: "doc_export",
  description: `Export a document to a downloadable file format.

USE THIS WHEN:
- User explicitly asks "Export this document" or "Download document as..."
- User needs to share document content outside the platform
- User wants to save document for offline access
- User needs document in a specific format for external tools

DO NOT USE WHEN:
- User just wants to read the document (use doc_get)
- User wants to share document within the platform (use doc_share)
- User wants to export search results (use search_export)

RETURNS: File ID and download URL for the exported document. Files are available for 24 hours.`,
  category: "documents",
  deferLoading: true,
  searchKeywords: ["export", "download", "save", "file", "offline"],
  requiredPermissions: ["documents:read", "export:write"],

  parameters: z.object({
    documentId: z
      .string()
      .describe(
        "The document ID to export. Obtain from search results or doc_list."
      ),
    format: z
      .enum(["json", "markdown", "text"])
      .default("markdown")
      .describe(
        "'markdown' for formatted text with headers, 'text' for plain text, 'json' for structured data with metadata."
      ),
    includeMetadata: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include document metadata (source, author, dates) in export."),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const document = await ctx.services.documents.get(params.documentId);
    if (!document) {
      return failure("NOT_FOUND", `Document ${params.documentId} not found`);
    }

    if (document.teamId !== ctx.teamId) {
      return failure("FORBIDDEN", "Document belongs to a different team");
    }

    const result = await ctx.services.documents.export({
      documentId: params.documentId,
      teamId: ctx.teamId,
      format: params.format,
    });

    return success(
      {
        fileId: result.fileId,
        fileName: result.fileName,
        format: result.format,
        size: result.size,
        downloadUrl: result.downloadUrl,
        expiresIn: "24 hours",
        document: {
          id: document.id,
          title: document.title,
          source: document.connectorType,
        },
        message: `Exported "${document.title}" to ${result.format.toUpperCase()}`,
      },
      { latencyMs: performance.now() - startTime, source: "export-service" }
    );
  },
});
