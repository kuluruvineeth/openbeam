import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const workspaceEntryListTool = defineTool({
  name: "workspace_entry_list",
  description: `List entries (rows) from a workspace object with pagination and sorting.

USE THIS WHEN:
- User wants to see records in a workspace object (e.g., "show me my leads")
- User asks to browse entries in a table
- User wants a quick overview of data in an object

DO NOT USE WHEN:
- User wants complex filtering or aggregations (use workspace_query)
- User wants to search across all sources (use search_hybrid)
- User wants to know what objects exist (use workspace_object_list)

RETURNS: Paginated list of entries with field values, total count, and pagination info.`,
  category: "data",
  deferLoading: true,
  searchKeywords: ["workspace", "entry", "list", "browse", "records", "rows"],

  parameters: z.object({
    objectName: z
      .string()
      .describe(
        "Name of the object to list entries from (e.g., 'leads', 'contacts')"
      ),
    limit: z
      .number()
      .min(1)
      .max(200)
      .optional()
      .default(20)
      .describe("Maximum entries to return (1-200)"),
    offset: z
      .number()
      .min(0)
      .optional()
      .default(0)
      .describe("Pagination offset"),
    orderBy: z
      .string()
      .optional()
      .default("created_at")
      .describe("Field to order by (default: created_at)"),
    orderDir: z
      .enum(["ASC", "DESC"])
      .optional()
      .default("DESC")
      .describe("Sort direction"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const startTime = performance.now();

    const { getTeamDuckDB, initializeEAVSchema, listEntries } =
      // biome-ignore lint/suspicious/noTsIgnore: cross-package type check cannot resolve workspace module
      // @ts-ignore — resolved at runtime via workspace
      await import("@openbeam/services");

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const result = await listEntries(db, params.objectName, {
      limit: params.limit,
      offset: params.offset,
      orderBy: params.orderBy,
      orderDir: params.orderDir,
    });

    return success(
      {
        objectName: params.objectName,
        entries: result.entries.map(
          (e: {
            id: string;
            values: Record<string, unknown>;
            createdAt: string;
            updatedAt: string;
          }) => ({
            id: e.id,
            values: e.values,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          })
        ),
        total: result.total,
        returned: result.entries.length,
        offset: params.offset,
        hasMore: (params.offset ?? 0) + result.entries.length < result.total,
      },
      { latencyMs: performance.now() - startTime, source: "duckdb" }
    );
  },
});
