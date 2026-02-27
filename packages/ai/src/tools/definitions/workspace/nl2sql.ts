import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import type { WorkspaceObjectSchema, WorkspaceSchema } from "../../services";

export const workspaceNl2sqlTool = defineTool({
  name: "workspace_nl2sql",
  description: `Convert a natural language question into a DuckDB SQL query for workspace data.

WHEN TO USE:
- When the user asks a data question about workspace objects (leads, contacts, etc.)
- When the user wants aggregations, joins, or analytics across workspace data
- Before executing a query (for human-in-the-loop review)

REQUIRES:
- Team context (teamId)
- A natural language question about the workspace data

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
1. workspace_nl2sql → returns SQL for review
2. User approves
3. workspace_query → runs the SQL`,
  category: "data",
  deferLoading: true,
  searchKeywords: [
    "workspace",
    "nl2sql",
    "natural language",
    "sql",
    "query",
    "generate",
  ],

  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    question: z
      .string()
      .min(1)
      .describe("Natural language question about workspace data"),
    objectName: z
      .string()
      .optional()
      .describe(
        "Scope to a specific workspace object (e.g., 'leads', 'contacts'). Omit to include all objects."
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const { getTeamDuckDB, initializeEAVSchema, listObjects, listEntries } =
      await import("@openplane/services");

    const db = await getTeamDuckDB(ctx.teamId);
    await initializeEAVSchema(db);

    const allObjects = await listObjects(db, ctx.teamId);

    const targetObjects = params.objectName
      ? allObjects.filter(
          (o: { name: string }) =>
            o.name.toLowerCase() === params.objectName?.toLowerCase()
        )
      : allObjects;

    if (targetObjects.length === 0) {
      return failure(
        "NOT_FOUND",
        params.objectName
          ? `Workspace object "${params.objectName}" not found`
          : "No workspace objects found"
      );
    }

    const SAMPLE_LIMIT = 3;
    const objectSchemas: WorkspaceObjectSchema[] = await Promise.all(
      targetObjects.map(
        async (obj: {
          name: string;
          description?: string;
          fields: { name: string; type: string; required: boolean }[];
        }) => {
          const entries = await listEntries(db, obj.name, {
            limit: SAMPLE_LIMIT,
          });
          return {
            name: obj.name,
            description: obj.description,
            fields: obj.fields,
            entryCount: entries.total,
            sampleData: entries.entries.map(
              (e: { values: Record<string, unknown> }) => e.values
            ),
          };
        }
      )
    );

    const schema: WorkspaceSchema = {
      teamId: ctx.teamId,
      objects: objectSchemas,
    };

    const result = await ctx.services.workspace.generateSql({
      teamId: ctx.teamId,
      question: params.question,
      schema,
    });

    return success(
      {
        sql: result.sql,
        explanation: result.explanation,
        referencedColumns: result.referencedColumns,
        complexity: result.estimatedComplexity,
        awaitingApproval: true,
      },
      { source: "ai" }
    );
  },
});
