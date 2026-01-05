import { z } from "zod";
import type { SpreadsheetColumn } from "./types";
import { extractReferencedColumns, validateSQL } from "./validation";

const COMPLEX_PATTERNS = [
  /\bjoin\b/,
  /\bsubquery\b/,
  /\bwith\b.*\bas\b/,
  /\bunion\b/,
  /\bintersect\b/,
  /\bexcept\b/,
] as const;

const MODERATE_PATTERNS = [
  /\bgroup\s+by\b/,
  /\bhaving\b/,
  /\border\s+by\b/,
  /\bcase\b.*\bwhen\b/,
  /\bwindow\b/,
  /\bover\s*\(/,
] as const;

const GROUP_BY_PATTERN =
  /group\s+by\s+([^)]+?)(?:\s+having|\s+order|\s+limit|$)/;
const SELECT_FROM_PATTERN = /select\s+(.+?)\s+from/;

export interface SqlGenerationContext {
  viewName: string;
  columns: SpreadsheetColumn[];
  sampleData: Record<string, unknown>[];
  rowCount: number;
}

export interface GeneratedSql {
  sql: string;
  explanation: string;
  referencedColumns: string[];
  complexity: "simple" | "moderate" | "complex";
  warnings?: string[];
}

export interface LlmGeneratorDeps {
  generateSql: (params: {
    query: string;
    schema: SqlGenerationContext;
    systemPrompt: string;
  }) => Promise<{ sql: string; explanation: string }>;
}

export const SqlGenerationRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  context: z.object({
    viewName: z.string(),
    columns: z.array(
      z.object({
        name: z.string(),
        type: z.enum(["string", "number", "date", "boolean", "unknown"]),
        nullable: z.boolean(),
      })
    ),
    sampleData: z.array(z.record(z.string(), z.unknown())).max(10),
    rowCount: z.number().int().nonnegative(),
  }),
});

export type SqlGenerationRequest = z.infer<typeof SqlGenerationRequestSchema>;

export function buildSchemaDescription(context: SqlGenerationContext): string {
  const lines: string[] = [];

  lines.push(`Table: "${context.viewName}"`);
  lines.push(`Rows: ${context.rowCount.toLocaleString()}`);
  lines.push("");
  lines.push("Columns:");

  for (const col of context.columns) {
    const nullable = col.nullable ? " (nullable)" : "";
    lines.push(`  - ${col.name}: ${col.type}${nullable}`);
  }

  if (context.sampleData.length > 0) {
    lines.push("");
    lines.push("Sample data:");
    for (let i = 0; i < Math.min(3, context.sampleData.length); i++) {
      const row = context.sampleData[i];
      if (!row) {
        continue;
      }
      const preview = Object.entries(row)
        .slice(0, 4)
        .map(([k, v]) => `${k}=${formatValue(v)}`)
        .join(", ");
      lines.push(`  ${preview}`);
    }
  }

  return lines.join("\n");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "string") {
    return value.length > 20 ? `"${value.slice(0, 20)}..."` : `"${value}"`;
  }
  return String(value);
}

export function buildSystemPrompt(context: SqlGenerationContext): string {
  const schemaDesc = buildSchemaDescription(context);

  return `You are a SQL expert. Generate DuckDB-compatible SQL for the user's question.

Schema:
${schemaDesc}

Rules:
1. Always use the exact table name: "${context.viewName}"
2. Always quote column names with double quotes
3. Use DuckDB SQL syntax
4. Include LIMIT 1000 unless the user asks for all data
5. For aggregations, include meaningful GROUP BY clauses
6. Handle NULL values appropriately
7. Return ONLY the SQL query, no explanations

Available aggregation functions: SUM, AVG, COUNT, MIN, MAX, MEDIAN, STDDEV
Available date functions: DATE_TRUNC, DATE_PART, EXTRACT
Available string functions: LOWER, UPPER, CONCAT, SUBSTRING, TRIM`;
}

export function assessComplexity(
  sql: string
): "simple" | "moderate" | "complex" {
  const lowerSql = sql.toLowerCase();

  if (COMPLEX_PATTERNS.some((p) => p.test(lowerSql))) {
    return "complex";
  }

  if (MODERATE_PATTERNS.some((p) => p.test(lowerSql))) {
    return "moderate";
  }

  return "simple";
}

export function detectWarnings(
  sql: string,
  context: SqlGenerationContext
): string[] {
  const warnings: string[] = [];
  const lowerSql = sql.toLowerCase();

  if (!lowerSql.includes("limit") && context.rowCount > 10_000) {
    warnings.push(
      "Query has no LIMIT clause and table has many rows. Consider adding a limit."
    );
  }

  if (lowerSql.includes("select *") && context.columns.length > 20) {
    warnings.push(
      "SELECT * on a table with many columns. Consider selecting specific columns."
    );
  }

  if (lowerSql.includes("like '%") || lowerSql.includes('like "%')) {
    warnings.push(
      "Leading wildcard in LIKE pattern may cause slow performance."
    );
  }

  const groupByMatch = lowerSql.match(GROUP_BY_PATTERN);
  if (groupByMatch) {
    const selectMatch = lowerSql.match(SELECT_FROM_PATTERN);
    const selectClause = selectMatch?.[1];
    if (selectClause?.includes("*")) {
      warnings.push("SELECT * with GROUP BY is ambiguous.");
    }
  }

  return warnings;
}

export function postProcessSql(sql: string, viewName: string): string {
  let processed = sql.trim();

  if (processed.endsWith(";")) {
    processed = processed.slice(0, -1);
  }

  if (!processed.toLowerCase().includes("limit")) {
    processed = `${processed} LIMIT 1000`;
  }

  const tablePattern = new RegExp(
    `\\b(?:FROM|JOIN)\\s+(?!")(${viewName})(?!")\\b`,
    "gi"
  );
  processed = processed.replace(tablePattern, (_, table) => `FROM "${table}"`);

  return processed;
}

export async function generateSqlFromNaturalLanguage(
  query: string,
  context: SqlGenerationContext,
  deps: LlmGeneratorDeps
): Promise<GeneratedSql> {
  const systemPrompt = buildSystemPrompt(context);

  const { sql: rawSql, explanation } = await deps.generateSql({
    query,
    schema: context,
    systemPrompt,
  });

  const processedSql = postProcessSql(rawSql, context.viewName);

  const validationResult = validateSQL(processedSql, [
    context.viewName,
    "data",
  ]);
  if (!validationResult.valid) {
    throw new Error(
      `Generated SQL is invalid: ${validationResult.error ?? "Unknown error"}`
    );
  }

  const referencedColumns = extractReferencedColumns(processedSql);
  const complexity = assessComplexity(processedSql);
  const warnings = detectWarnings(processedSql, context);

  return {
    sql: processedSql,
    explanation,
    referencedColumns,
    complexity,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
