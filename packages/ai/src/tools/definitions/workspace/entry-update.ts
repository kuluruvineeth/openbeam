import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const workspaceEntryUpdateTool = defineTool({
  name: "workspace_entry_update",
  description: `Update an existing entry (row) in a workspace object.

USE THIS WHEN:
- User wants to modify field values on an existing record
- User asks to update a specific entry (e.g., "change the status of lead X")
- User provides corrections to existing data

DO NOT USE WHEN:
- User wants to create a new entry (use workspace_entry_create)
- User wants to delete an entry
- User wants to update the object schema (fields/structure)

RETURNS: The updated entry with all current field values.`,
  category: "data",
  deferLoading: true,
  searchKeywords: ["workspace", "entry", "update", "edit", "modify", "change"],

  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    objectName: z.string().describe("Name of the object containing the entry"),
    entryId: z.string().describe("ID of the entry to update"),
    values: z
      .record(z.string(), z.unknown())
      .describe(
        'Field values to update. Only provided fields are modified. Set to null to clear a field. Example: {"status": "qualified", "email": "new@example.com"}'
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const startTime = performance.now();

    const { getTeamDuckDB, initializeEAVSchema, updateEntry } = await import(
      "@openbeam/services"
    );

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const entry = await updateEntry(db, params.objectName, params.entryId, {
      values: params.values,
    });

    return success(
      {
        entryId: entry.id,
        objectName: params.objectName,
        values: entry.values,
        updatedAt: entry.updatedAt,
      },
      { latencyMs: performance.now() - startTime, source: "duckdb" }
    );
  },
});
