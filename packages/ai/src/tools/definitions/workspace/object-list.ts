import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const workspaceObjectListTool = defineTool({
  name: "workspace_object_list",
  description: `List all object types in the team's workspace database.

USE THIS WHEN:
- User asks "what objects/tables do I have?" or "show me my workspace schema"
- User wants to explore the workspace before querying
- User needs to find an object name to use in other workspace tools

DO NOT USE WHEN:
- User wants to see entries/rows in an object (use workspace_entry_list)
- User wants to run a custom query (use workspace_query)

RETURNS: List of objects with their names, descriptions, field counts, and default views.`,
  category: "data",
  deferLoading: true,
  searchKeywords: ["workspace", "object", "list", "schema", "tables", "browse"],

  parameters: z.object({
    includeFields: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include field definitions for each object"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const startTime = performance.now();

    const { getTeamDuckDB, initializeEAVSchema, listObjects } = await import(
      "@openbeam/services"
    );

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const objects = await listObjects(db, ctx.teamId);

    const result = objects.map(
      (obj: {
        name: string;
        description?: string;
        icon?: string;
        color?: string;
        defaultView: string;
        fields: Array<{ name: string; type: string; required: boolean }>;
        immutable: boolean;
      }) => ({
        name: obj.name,
        description: obj.description,
        icon: obj.icon,
        color: obj.color,
        defaultView: obj.defaultView,
        fieldCount: obj.fields.length,
        immutable: obj.immutable,
        ...(params.includeFields
          ? {
              fields: obj.fields.map(
                (f: { name: string; type: string; required: boolean }) => ({
                  name: f.name,
                  type: f.type,
                  required: f.required,
                })
              ),
            }
          : {}),
      })
    );

    return success(
      { objects: result, count: result.length },
      { latencyMs: performance.now() - startTime, source: "duckdb" }
    );
  },
});
