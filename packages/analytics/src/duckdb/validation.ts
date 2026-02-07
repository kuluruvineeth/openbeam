import NodeSqlParser from "node-sql-parser";

type AST = NodeSqlParser.AST;
const { Parser } = NodeSqlParser;

import {
  DuckDBApiError,
  DuckDBErrorCodes,
  type ValidationResult,
} from "./types";

const parser = new Parser();

const VALID_TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const BLOCKED_FUNCTIONS = new Set([
  "read_csv",
  "read_csv_auto",
  "read_parquet",
  "read_xlsx",
  "read_json",
  "read_json_auto",
  "read_text",
  "read_blob",
  "copy",
  "export_csv",
  "export_parquet",
  "attach",
  "detach",
  "load",
  "install",
  "glob",
  "httpfs",
  "system",
  "getenv",
  "query",
  "pragma",
  "checkpoint",
  "force_checkpoint",
]);

const BLOCKED_STATEMENT_TYPES = new Set([
  "create",
  "drop",
  "alter",
  "insert",
  "update",
  "delete",
  "truncate",
  "grant",
  "revoke",
  "set",
  "use",
  "attach",
  "detach",
  "pragma",
  "copy",
  "export",
  "import",
  "vacuum",
  "analyze",
]);

function extractFunctionNameFromNode(
  nameValue: unknown,
  results: string[]
): void {
  if (typeof nameValue === "string") {
    results.push(nameValue.toLowerCase());
    return;
  }

  if (typeof nameValue !== "object" || nameValue === null) {
    return;
  }

  const nameObj = nameValue as Record<string, unknown>;
  if (typeof nameObj.name === "string") {
    results.push(nameObj.name.toLowerCase());
    return;
  }

  if (!Array.isArray(nameObj.name)) {
    return;
  }

  for (const part of nameObj.name) {
    if (
      typeof part === "object" &&
      part !== null &&
      "value" in part &&
      typeof part.value === "string"
    ) {
      results.push(part.value.toLowerCase());
    }
  }
}

function extractFunctionCalls(ast: AST | AST[]): string[] {
  const functions: string[] = [];

  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    const obj = node as Record<string, unknown>;

    if (obj.type === "function") {
      extractFunctionNameFromNode(obj.name, functions);
    }

    Object.values(obj).forEach(traverse);
  }

  traverse(ast);
  return functions;
}

function extractTableReferences(ast: AST | AST[]): string[] {
  const tables: string[] = [];

  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    const obj = node as Record<string, unknown>;

    if (obj.table && typeof obj.table === "string") {
      tables.push(obj.table);
    }

    Object.values(obj).forEach(traverse);
  }

  traverse(ast);
  return tables;
}

export function validateSQL(
  sql: string,
  allowedTables: string[]
): ValidationResult {
  try {
    const ast = parser.astify(sql, { database: "PostgreSQL" });
    const statements = Array.isArray(ast) ? ast : [ast];

    for (const stmt of statements) {
      const stmtType = stmt.type?.toLowerCase();
      if (stmtType && BLOCKED_STATEMENT_TYPES.has(stmtType)) {
        return {
          valid: false,
          error: `Statement type '${stmt.type}' not allowed`,
        };
      }
    }

    const functionCalls = extractFunctionCalls(ast);
    for (const fn of functionCalls) {
      if (BLOCKED_FUNCTIONS.has(fn)) {
        return {
          valid: false,
          error: `Function '${fn}' not allowed`,
        };
      }
    }

    const tableRefs = extractTableReferences(ast);
    const allowedSet = new Set(allowedTables.map((t) => t.toLowerCase()));

    for (const table of tableRefs) {
      if (!allowedSet.has(table.toLowerCase())) {
        return {
          valid: false,
          error: `Table '${table}' not in allowed list`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parse error";
    return {
      valid: false,
      error: `SQL parse error: ${message}`,
    };
  }
}

export function assertValidSQL(sql: string, allowedTables: string[]): void {
  const result = validateSQL(sql, allowedTables);
  if (!result.valid) {
    throw new DuckDBApiError({
      message: result.error ?? "Invalid SQL",
      code: DuckDBErrorCodes.SQL_INVALID,
      retryable: false,
    });
  }
}

export function sanitizeTableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function validateTableName(name: string): boolean {
  return VALID_TABLE_NAME_PATTERN.test(name);
}

export function extractReferencedColumns(sql: string): string[] {
  const columns: string[] = [];

  try {
    const ast = parser.astify(sql, { database: "PostgreSQL" });

    function traverse(node: unknown): void {
      if (!node || typeof node !== "object") {
        return;
      }

      if (Array.isArray(node)) {
        node.forEach(traverse);
        return;
      }

      const obj = node as Record<string, unknown>;

      if (obj.type === "column_ref" && typeof obj.column === "string") {
        columns.push(obj.column);
      }

      Object.values(obj).forEach(traverse);
    }

    traverse(ast);
  } catch {
    return columns;
  }

  return [...new Set(columns)];
}

export function addLimitClause(sql: string, limit: number): string {
  const upperSql = sql.toUpperCase().trim();

  if (upperSql.includes("LIMIT")) {
    return sql;
  }

  return `${sql.trim()} LIMIT ${limit}`;
}

export function escapeSqlStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
