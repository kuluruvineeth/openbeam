import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const FieldTypeEnum = z.enum([
  "text",
  "email",
  "phone",
  "url",
  "number",
  "currency",
  "percent",
  "boolean",
  "date",
  "datetime",
  "enum",
  "multi_enum",
  "relation",
  "user",
  "file",
  "richtext",
]);

export const workspaceObjectCreateTool = defineTool({
  name: "workspace_object_create",
  description: `Create a new object type in the team's workspace database.

USE THIS WHEN:
- User wants to create a new data model (e.g., "create a leads table", "add a contacts object")
- User asks to set up a new workspace schema
- User wants to track a new entity type in the workspace

DO NOT USE WHEN:
- User wants to add entries to an existing object (use workspace_entry_create)
- User wants to modify an existing object (use a different approach)
- User wants to query data (use workspace_query)

RETURNS: The created object definition with its fields, ID, and metadata.`,
  category: "data",
  deferLoading: true,
  searchKeywords: ["workspace", "object", "create", "schema", "table", "model"],

  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .describe(
        "Object name using snake_case (e.g., 'leads', 'contacts', 'deal_pipeline'). Must start with a letter or underscore."
      ),
    description: z
      .string()
      .optional()
      .describe("Brief description of what this object represents"),
    icon: z.string().optional().describe("Icon identifier for the object"),
    color: z
      .string()
      .optional()
      .describe("Color hex code for the object (e.g., '#2563eb')"),
    defaultView: z
      .enum(["table", "kanban", "list", "grid"])
      .optional()
      .describe("Default view type for displaying entries"),
    fields: z
      .array(
        z.object({
          name: z.string().min(1).max(128).describe("Field name"),
          type: FieldTypeEnum.describe("Field data type"),
          required: z
            .boolean()
            .optional()
            .describe("Whether this field is required"),
          defaultValue: z
            .string()
            .optional()
            .describe("Default value for new entries"),
          enumValues: z
            .array(z.string())
            .optional()
            .describe("Allowed values for enum or multi_enum fields"),
          enumColors: z
            .record(z.string(), z.string())
            .optional()
            .describe("Color mapping for enum values"),
          relatedObjectId: z
            .string()
            .optional()
            .describe("Target object ID for relation fields"),
          relationshipType: z
            .enum(["many_to_one", "many_to_many"])
            .optional()
            .describe("Relationship cardinality for relation fields"),
          description: z.string().optional().describe("Field description"),
        })
      )
      .min(1)
      .describe(
        "Field definitions for the object. At least one field is required."
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const startTime = performance.now();

    const { getTeamDuckDB, initializeEAVSchema, createObject } = await import(
      "@openplane/services"
    );

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const obj = await createObject(db, params, ctx.teamId);

    return success(
      {
        id: obj.id,
        name: obj.name,
        description: obj.description,
        fieldCount: obj.fields.length,
        fields: obj.fields.map(
          (f: { name: string; type: string; required: boolean }) => ({
            name: f.name,
            type: f.type,
            required: f.required,
          })
        ),
      },
      { latencyMs: performance.now() - startTime, source: "duckdb" }
    );
  },
});
