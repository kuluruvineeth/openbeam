import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const getSpreadsheetSchemaTool = defineTool({
  name: "get_spreadsheet_schema",
  description: `Get the schema and sample data from a spreadsheet document.

WHEN TO USE:
- User asks about a spreadsheet's structure or contents
- Before generating SQL queries against spreadsheet data
- When the user wants to understand what columns/data types are available

RETURNS:
- Column names and inferred types (string, number, date, boolean)
- Sample data rows (first 5 rows)
- Total row count
- Available sheets (for Excel files)

EXAMPLE QUERIES:
- "What columns are in this spreadsheet?"
- "Show me the structure of sales_data.xlsx"
- "What data types does this CSV have?"`,
  category: "data",
  searchKeywords: [
    "spreadsheet",
    "schema",
    "columns",
    "csv",
    "excel",
    "xlsx",
    "structure",
  ],

  parameters: z.object({
    documentId: z.string().describe("The ID of the spreadsheet document"),
    sheet: z
      .string()
      .optional()
      .describe("Sheet name for Excel files (defaults to first sheet)"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const schema = await ctx.services.analytics.getSpreadsheetSchema(
      params.documentId,
      ctx.teamId
    );

    const columnSummary = schema.columns
      .map(
        (col) => `${col.name} (${col.type}${col.nullable ? ", nullable" : ""})`
      )
      .join(", ");

    return success(
      {
        schema,
        summary: {
          fileName: schema.fileName,
          rowCount: schema.rowCount,
          columnCount: schema.columns.length,
          columns: columnSummary,
          sheets: schema.sheets,
          activeSheet: schema.activeSheet,
        },
      },
      { source: "duckdb" }
    );
  },
});
