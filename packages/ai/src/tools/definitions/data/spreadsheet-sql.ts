import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import type { SpreadsheetSchema } from "../../services";

const SpreadsheetColumnInputSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "date", "boolean", "unknown"]),
  nullable: z.boolean(),
  sampleValues: z.array(z.unknown()).optional(),
});

const SpreadsheetSchemaInputSchema = z.object({
  documentId: z.string(),
  fileName: z.string(),
  sheets: z.array(z.string()),
  activeSheet: z.string(),
  columns: z.array(SpreadsheetColumnInputSchema),
  rowCount: z.number(),
  sampleData: z.array(z.record(z.string(), z.unknown())),
});

export const generateSpreadsheetSqlTool = defineTool({
  name: "generate_spreadsheet_sql",
  description: `Convert a natural language question into a DuckDB SQL query for spreadsheet data.

WHEN TO USE:
- After getting the spreadsheet schema with get_spreadsheet_schema
- When the user asks a data question about spreadsheet contents
- Before executing a query (for human-in-the-loop review)

REQUIRES:
- The schema from get_spreadsheet_schema (pass it as the schema parameter)
- A natural language question about the data

RETURNS:
- Generated SQL query
- Explanation of what the query does
- Referenced columns
- Estimated complexity

HUMAN-IN-THE-LOOP:
Always show the generated SQL to the user before execution. This provides:
- Transparency about what will be executed
- Opportunity to correct misunderstandings
- Security validation

EXAMPLE FLOW:
1. get_spreadsheet_schema → returns schema
2. generate_spreadsheet_sql → returns SQL for review
3. User approves
4. execute_spreadsheet_query → runs the SQL`,
  category: "data",
  searchKeywords: [
    "sql",
    "query",
    "spreadsheet",
    "natural language",
    "generate",
  ],

  parameters: z.object({
    documentId: z.string().describe("The ID of the spreadsheet document"),
    question: z
      .string()
      .describe("Natural language question about the spreadsheet data"),
    schema: SpreadsheetSchemaInputSchema.describe(
      "The schema from get_spreadsheet_schema"
    ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const schema: SpreadsheetSchema = {
      documentId: params.schema.documentId,
      fileName: params.schema.fileName,
      sheets: params.schema.sheets,
      activeSheet: params.schema.activeSheet,
      columns: params.schema.columns,
      rowCount: params.schema.rowCount,
      sampleData: params.schema.sampleData,
    };

    const result = await ctx.services.analytics.generateSql({
      documentId: params.documentId,
      naturalLanguageQuery: params.question,
      schema,
    });

    return success(
      {
        sql: result.sql,
        explanation: result.explanation,
        referencedColumns: result.referencedColumns,
        complexity: result.estimatedComplexity,
        viewName: `data_${params.documentId.replace(/-/g, "_")}`,
        awaitingApproval: true,
      },
      { source: "ai" }
    );
  },
});
