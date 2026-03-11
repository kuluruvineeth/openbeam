import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const workspaceQueryTool = defineTool({
  name: "workspace_query",
  description: `Execute a read-only SQL query against the team's workspace DuckDB database.

USE THIS WHEN:
- User wants to analyze workspace data with custom SQL
- User asks for aggregations, counts, or statistics on workspace objects
- User needs to join data across workspace objects
- User wants to filter or sort workspace entries in custom ways

DO NOT USE WHEN:
- User wants to list objects or entries (use workspace_object_list or workspace_entry_list)
- User wants to create or modify data (use workspace_entry_create or workspace_entry_update)
- User wants to search across enterprise sources (use search_hybrid)

RETURNS: Query results with columns, rows, and execution time. Only read-only SQL is allowed (SELECT, PRAGMA, DESCRIBE, SHOW, EXPLAIN, WITH).

SCHEMA HINT: Objects are stored as tables with a "v_" prefix (e.g., v_leads, v_contacts). Use SHOW TABLES or DESCRIBE v_objectname to explore the schema.`,
  category: "data",
  deferLoading: true,
  searchKeywords: [
    "workspace",
    "query",
    "sql",
    "duckdb",
    "analytics",
    "aggregate",
  ],

  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    sql: z
      .string()
      .min(1)
      .describe(
        "Read-only SQL query. Use SELECT, PRAGMA, DESCRIBE, SHOW, EXPLAIN, or WITH. Views are prefixed with v_ (e.g., SELECT * FROM v_leads LIMIT 10)"
      ),
    maxRows: z
      .number()
      .min(1)
      .max(10_000)
      .optional()
      .default(100)
      .describe("Maximum rows to return (1-10000)"),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Query timeout in milliseconds (1000-30000)"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const startTime = performance.now();

    const { getTeamDuckDB, executeQuery, initializeEAVSchema } =
      // biome-ignore lint/suspicious/noTsIgnore: cross-package type check cannot resolve workspace module
      // @ts-ignore — resolved at runtime via workspace
      await import("@openbeam/services");

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const result = await executeQuery(db, params.sql, {
      readOnly: true,
      timeoutMs: params.timeoutMs,
      maxRows: params.maxRows,
    });

    return success(
      {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        queryTimeMs: result.queryTimeMs,
      },
      { latencyMs: performance.now() - startTime, source: "duckdb" }
    );
  },
});
