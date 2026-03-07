import { CompletionService } from "@openbeam/ai";

export interface WorkspaceObjectSchema {
  name: string;
  description?: string;
  fields: { name: string; type: string; required: boolean }[];
  entryCount: number;
  sampleData: Record<string, unknown>[];
}

export interface GenerateWorkspaceSqlParams {
  teamId: string;
  question: string;
  schema: {
    teamId: string;
    objects: WorkspaceObjectSchema[];
  };
}

export interface GenerateWorkspaceSqlResult {
  sql: string;
  explanation: string;
  referencedColumns: string[];
  estimatedComplexity: "simple" | "moderate" | "complex";
}

const WORKSPACE_SQL_PROMPT = `You are a SQL expert for workspace data stored in DuckDB using an EAV (Entity-Attribute-Value) schema.

Each workspace object has a pivot view named after the object (e.g., a "leads" object has a view called "leads").
Views have columns matching the object's field definitions.

AVAILABLE OBJECTS:
{schema}

RULES:
1. Use only SELECT statements (read-only)
2. Reference tables by their object name (lowercase, as-is)
3. Use double quotes for column names containing spaces or special characters
4. Return valid DuckDB SQL syntax
5. Keep queries simple and efficient
6. For cross-object queries, use the object name as the table name
7. Use LIMIT to prevent excessive results

Respond with a JSON object:
{
  "sql": "your SQL query here",
  "explanation": "brief explanation of what the query does",
  "referencedColumns": ["col1", "col2"],
  "estimatedComplexity": "simple" | "moderate" | "complex"
}`;

function buildSchemaDescription(objects: WorkspaceObjectSchema[]): string {
  return objects
    .map((obj) => {
      const fields = obj.fields
        .map(
          (f) => `    - ${f.name}: ${f.type}${f.required ? " (required)" : ""}`
        )
        .join("\n");

      const samples =
        obj.sampleData.length > 0
          ? `  Sample data: ${JSON.stringify(obj.sampleData.slice(0, 2))}`
          : "";

      return `Object: ${obj.name}${obj.description ? ` — ${obj.description}` : ""}
  Fields:
${fields}
  Entry count: ${obj.entryCount}${samples ? `\n${samples}` : ""}`;
    })
    .join("\n\n");
}

function estimateComplexity(sql: string): "simple" | "moderate" | "complex" {
  const upperSql = sql.toUpperCase();
  const hasJoin = upperSql.includes("JOIN");
  const hasSubquery = (upperSql.match(/SELECT/g) || []).length > 1;
  const hasAggregation =
    upperSql.includes("GROUP BY") || upperSql.includes("HAVING");
  const hasWindow = upperSql.includes("OVER(") || upperSql.includes("OVER (");

  if (hasSubquery || hasWindow || (hasJoin && hasAggregation)) {
    return "complex";
  }
  if (hasJoin || hasAggregation) {
    return "moderate";
  }
  return "simple";
}

function extractReferencedColumns(sql: string): string[] {
  const columns = new Set<string>();
  for (const m of sql.matchAll(/"([^"]+)"/g)) {
    if (m[1]) {
      columns.add(m[1]);
    }
  }
  return Array.from(columns);
}

export async function generateWorkspaceSql(
  params: GenerateWorkspaceSqlParams
): Promise<GenerateWorkspaceSqlResult> {
  const schemaDescription = buildSchemaDescription(params.schema.objects);
  const systemPrompt = WORKSPACE_SQL_PROMPT.replace(
    "{schema}",
    schemaDescription
  );

  const completionService = new CompletionService();
  const result = await completionService.complete(
    [{ role: "user", content: `Question: ${params.question}` }],
    { systemPrompt, temperature: 0.1 }
  );

  try {
    const parsed = JSON.parse(result.content) as {
      sql: string;
      explanation: string;
      referencedColumns?: string[];
      estimatedComplexity?: string;
    };

    const sql = parsed.sql;
    const referencedColumns =
      parsed.referencedColumns ?? extractReferencedColumns(sql);
    const complexity =
      parsed.estimatedComplexity === "simple" ||
      parsed.estimatedComplexity === "moderate" ||
      parsed.estimatedComplexity === "complex"
        ? parsed.estimatedComplexity
        : estimateComplexity(sql);

    return {
      sql,
      explanation: parsed.explanation,
      referencedColumns,
      estimatedComplexity: complexity,
    };
  } catch {
    const fallbackTable = params.schema.objects[0]?.name ?? "workspace_objects";
    return {
      sql: `SELECT * FROM "${fallbackTable}" LIMIT 10`,
      explanation: "Fallback query — could not parse LLM response",
      referencedColumns: [],
      estimatedComplexity: "simple",
    };
  }
}
