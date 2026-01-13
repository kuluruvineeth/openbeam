import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchExportTool = defineTool({
  name: "search_export",
  description: `Export search results to a downloadable file format.

USE THIS WHEN:
- User explicitly asks "Export these results" or "Download search results"
- User needs to share search findings with others outside the platform
- User wants to analyze results in spreadsheet software (CSV export)
- User needs search results for a report or documentation (Markdown)
- User wants machine-readable output for further processing (JSON)

DO NOT USE WHEN:
- User just wants to view search results (use search_hybrid)
- User wants to save a search query for later reuse (use search_save)
- User wants to share results within the platform (results are already accessible)

RETURNS: File ID and download URL for the exported results. Files are available for 24 hours.`,
  category: "search",
  deferLoading: true,
  searchKeywords: ["export", "download", "csv", "json", "report", "save file"],
  requiredPermissions: ["search:read", "export:write"],

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe("The search query to export results for."),
    format: z
      .enum(["json", "csv", "markdown"])
      .default("csv")
      .describe(
        "'csv' for spreadsheet import, 'json' for programmatic use, 'markdown' for documentation."
      ),
    limit: z
      .number()
      .min(1)
      .max(500)
      .optional()
      .default(100)
      .describe(
        "Maximum results to export (1-500). Higher limits may take longer to process."
      ),
    filters: z
      .object({
        connectorTypes: z.array(z.string()).optional(),
        dateRange: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional(),
      })
      .optional()
      .describe("Optional filters to apply before export."),
    includeContent: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include full document content in export. Warning: significantly increases file size."
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const result = await ctx.services.search.export({
      teamId: ctx.teamId,
      query: params.query,
      format: params.format,
      limit: params.limit,
    });

    return success(
      {
        fileId: result.fileId,
        fileName: result.fileName,
        format: result.format,
        size: result.size,
        downloadUrl: result.downloadUrl,
        expiresIn: "24 hours",
        resultCount: params.limit,
        message: `Exported ${params.limit} results to ${result.format.toUpperCase()}`,
      },
      { latencyMs: performance.now() - startTime, source: "export-service" }
    );
  },
});
