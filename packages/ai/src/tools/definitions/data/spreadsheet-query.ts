import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const executeSpreadsheetQueryTool = defineTool({
  name: "execute_spreadsheet_query",
  description: `Execute a SQL query against spreadsheet data using DuckDB.

WHEN TO USE:
- After generating SQL with generate_spreadsheet_sql
- When the user has approved the SQL query
- To get actual results from spreadsheet data

REQUIRES:
- A valid SQL query (from generate_spreadsheet_sql)
- The documentId and viewName from the previous tool

CONSTRAINTS:
- Read-only queries only (SELECT)
- Maximum 10,000 result rows
- 30 second timeout
- Memory-safe execution

RETURNS:
- Query results as rows
- Column types
- Row count and scan statistics
- Execution latency

SECURITY:
- SQL is validated before execution
- Only SELECT statements allowed
- No file system access
- No external data access`,
  category: "data",
  searchKeywords: ["execute", "sql", "query", "spreadsheet", "duckdb"],

  parameters: z.object({
    documentId: z.string().describe("The ID of the spreadsheet document"),
    sql: z.string().describe("The SQL query to execute"),
    viewName: z
      .string()
      .describe("The view name from generate_spreadsheet_sql"),
    maxRows: z
      .number()
      .min(1)
      .max(10_000)
      .optional()
      .default(1000)
      .describe("Maximum rows to return (default 1000, max 10000)"),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Query timeout in milliseconds (default 10s, max 30s)"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const result = await ctx.services.analytics.executeQuery({
      documentId: params.documentId,
      sql: params.sql,
      viewName: params.viewName,
      options: {
        timeoutMs: params.timeoutMs,
        maxRows: params.maxRows,
      },
    });

    const formattedResult = formatQueryResult(result.rows, result.columnTypes);

    return success(
      {
        rows: result.rows,
        columnTypes: result.columnTypes,
        rowCount: result.rowCount,
        totalRowsScanned: result.totalRowsScanned,
        executedSql: result.executedSql,
        formattedTable: formattedResult,
        performance: {
          latencyMs: result.latencyMs,
          rowsPerSecond: Math.round(
            result.totalRowsScanned / (result.latencyMs / 1000)
          ),
        },
      },
      { source: "duckdb", latencyMs: result.latencyMs }
    );
  },
});

function formatQueryResult(
  rows: Record<string, unknown>[],
  columnTypes: Record<string, string>
): string {
  if (rows.length === 0) {
    return "No results";
  }

  const columns = Object.keys(columnTypes);
  const maxRows = Math.min(rows.length, 20);

  const columnWidths = new Map<string, number>();
  for (const col of columns) {
    let maxWidth = col.length;
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      if (!row) {
        continue;
      }
      const val = formatValue(row[col]);
      if (val.length > maxWidth) {
        maxWidth = Math.min(val.length, 50);
      }
    }
    columnWidths.set(col, maxWidth);
  }

  const header = columns
    .map((col) => col.padEnd(columnWidths.get(col) ?? col.length))
    .join(" | ");
  const separator = columns
    .map((col) => "-".repeat(columnWidths.get(col) ?? col.length))
    .join("-+-");

  const dataRows = rows.slice(0, maxRows).map((row) =>
    columns
      .map((col) => {
        const val = formatValue(row[col]);
        const width = columnWidths.get(col) ?? col.length;
        return val.length > width
          ? `${val.slice(0, width - 1)}…`
          : val.padEnd(width);
      })
      .join(" | ")
  );

  let result = `${header}\n${separator}\n${dataRows.join("\n")}`;

  if (rows.length > maxRows) {
    result += `\n... and ${rows.length - maxRows} more rows`;
  }

  return result;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (value instanceof Date) {
    const isoString = value.toISOString();
    const datePart = isoString.split("T")[0];
    return datePart ?? isoString;
  }
  return String(value);
}
