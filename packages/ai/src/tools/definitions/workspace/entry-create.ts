import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const workspaceEntryCreateTool = defineTool({
  name: "workspace_entry_create",
  description: `Create a new entry (row) in a workspace object.

USE THIS WHEN:
- User wants to add a new record (e.g., "add a new lead", "create a contact")
- User provides data to insert into a workspace table
- User asks to populate workspace with sample data

DO NOT USE WHEN:
- User wants to update an existing entry (use workspace_entry_update)
- User wants to import bulk data from CSV/JSON (use workspace_import)
- User wants to create a new object schema (use workspace_object_create)

RETURNS: The created entry ID and values.`,
  category: "data",
  deferLoading: true,
  searchKeywords: ["workspace", "entry", "create", "add", "insert", "record"],

  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    objectName: z
      .string()
      .describe(
        "Name of the target object (e.g., 'leads', 'contacts'). Use workspace_object_list to discover available objects."
      ),
    values: z
      .record(z.string(), z.unknown())
      .describe(
        'Field values for the new entry. Keys are field names, values are the data to set. Example: {"name": "John Doe", "email": "john@example.com"}'
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const startTime = performance.now();

    const { getTeamDuckDB, initializeEAVSchema, getObject, createEntry } =
      // biome-ignore lint/suspicious/noTsIgnore: cross-package type check cannot resolve workspace module
      // @ts-ignore — resolved at runtime via workspace
      await import("@openbeam/services");

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const obj = await getObject(db, params.objectName);
    if (!obj) {
      return failure("NOT_FOUND", `Object '${params.objectName}' not found`, {
        suggestion: "Use workspace_object_list to see available objects",
      });
    }

    const entry = await createEntry(db, {
      objectId: obj.id,
      values: params.values,
    });

    return success(
      {
        entryId: entry.id,
        objectName: params.objectName,
        values: entry.values,
        createdAt: entry.createdAt,
      },
      { latencyMs: performance.now() - startTime, source: "duckdb" }
    );
  },
});
