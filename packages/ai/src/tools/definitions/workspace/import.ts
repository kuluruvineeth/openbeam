import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const workspaceImportTool = defineTool({
  name: "workspace_import",
  description: `Import data into a workspace object from CSV or JSON format.

USE THIS WHEN:
- User wants to bulk import data into a workspace table
- User provides CSV or JSON data to load
- User asks to populate an object with external data

DO NOT USE WHEN:
- User wants to create a single entry (use workspace_entry_create)
- User wants to query existing data (use workspace_query)
- User wants to create a new object schema (use workspace_object_create)

RETURNS: Import summary with total rows, imported count, skipped count, and any errors.`,
  category: "data",
  deferLoading: true,
  searchKeywords: [
    "workspace",
    "import",
    "csv",
    "json",
    "bulk",
    "load",
    "upload",
  ],

  stakes: "medium",
  reversibility: "hard",

  parameters: z.object({
    objectName: z.string().describe("Name of the target object to import into"),
    format: z.enum(["csv", "json"]).describe("Format of the input data"),
    data: z
      .string()
      .describe(
        "The data to import. For CSV: include headers as first row. For JSON: a JSON array of objects."
      ),
    columnMapping: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'Map source column names to object field names. Example: {"Company Name": "company_name"}'
      ),
    skipInvalidRows: z
      .boolean()
      .optional()
      .default(true)
      .describe("Skip rows with validation errors instead of stopping"),
    batchSize: z
      .number()
      .min(1)
      .max(10_000)
      .optional()
      .default(500)
      .describe("Number of rows to process per batch"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const startTime = performance.now();

    const { getTeamDuckDB, initializeEAVSchema, importCSV, importJSON } =
      // biome-ignore lint/suspicious/noTsIgnore: cross-package type check cannot resolve workspace module
      // @ts-ignore — resolved at runtime via workspace
      await import("@openbeam/services");

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const config = {
      format: params.format as "csv" | "json",
      objectName: params.objectName,
      columnMapping: params.columnMapping,
      skipInvalidRows: params.skipInvalidRows ?? true,
      batchSize: params.batchSize ?? 500,
    };

    const result =
      params.format === "csv"
        ? await importCSV(db, params.data, config)
        : await importJSON(
            db,
            JSON.parse(params.data) as Record<string, unknown>[],
            config
          );

    return success(
      {
        objectName: params.objectName,
        totalRows: result.totalRows,
        importedRows: result.importedRows,
        skippedRows: result.skippedRows,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 10),
      },
      { latencyMs: performance.now() - startTime, source: "duckdb" }
    );
  },
});
