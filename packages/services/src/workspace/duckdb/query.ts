import type { WorkspaceQueryResult } from "@openplane/types/services/workspace";
import { type WorkspaceDuckDB, WorkspaceDuckDBError } from "./client";

const READ_ONLY_SQL_PREFIXES = [
  "SELECT",
  "PRAGMA",
  "DESCRIBE",
  "SHOW",
  "EXPLAIN",
  "WITH",
] as const;

const QUERY_TIMEOUT_MS = 10_000;
const MAX_RESULT_ROWS = 10_000;

const DANGEROUS_KEYWORDS = [
  "DROP",
  "DELETE",
  "INSERT",
  "UPDATE",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "ATTACH",
  "DETACH",
  "COPY",
  "EXPORT",
  "IMPORT",
  "LOAD",
  "INSTALL",
];

export function isReadOnlyQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return READ_ONLY_SQL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export function validateQuerySafety(sql: string, readOnly: boolean): void {
  if (!readOnly) {
    return;
  }

  if (!isReadOnlyQuery(sql)) {
    throw new WorkspaceDuckDBError(
      `Only read-only queries (${READ_ONLY_SQL_PREFIXES.join(", ")}) are allowed`,
      "QUERY_NOT_ALLOWED",
      false
    );
  }

  const upper = sql.toUpperCase();
  for (const keyword of DANGEROUS_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    if (pattern.test(upper) && !upper.startsWith("EXPLAIN")) {
      throw new WorkspaceDuckDBError(
        `Statement contains forbidden keyword: ${keyword}`,
        "QUERY_NOT_ALLOWED",
        false
      );
    }
  }
}

function addResultLimit(sql: string, maxRows: number): string {
  const upper = sql.trim().toUpperCase();
  if (upper.includes("LIMIT")) {
    return sql;
  }
  return `${sql.trim()} LIMIT ${maxRows}`;
}

export async function executeQuery(
  db: WorkspaceDuckDB,
  sql: string,
  options: {
    readOnly?: boolean;
    timeoutMs?: number;
    maxRows?: number;
  } = {}
): Promise<WorkspaceQueryResult> {
  const readOnly = options.readOnly ?? true;
  const timeoutMs = options.timeoutMs ?? QUERY_TIMEOUT_MS;
  const maxRows = options.maxRows ?? MAX_RESULT_ROWS;

  validateQuerySafety(sql, readOnly);

  const safeSql = readOnly ? addResultLimit(sql, maxRows) : sql;

  const startTime = performance.now();

  const result = await Promise.race([
    executeInternal(db, safeSql),
    createTimeout(timeoutMs),
  ]);

  const queryTimeMs = performance.now() - startTime;

  return {
    ...result,
    queryTimeMs,
  };
}

async function executeInternal(
  db: WorkspaceDuckDB,
  sql: string
): Promise<Omit<WorkspaceQueryResult, "queryTimeMs">> {
  const conn = db.getConnection();
  const result = await conn.run(sql);
  const columnNames = result.columnNames();
  const columnTypes = result.columnTypes();
  const rawRows = await result.getRows();

  const columns = columnNames.map((name: string, idx: number) => ({
    name,
    type: columnTypes[idx]?.toString() ?? "unknown",
  }));

  const rows = rawRows.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columnNames.length; i++) {
      const colName = columnNames[i];
      if (!colName) {
        continue;
      }
      const value = row[i];
      obj[colName] = value instanceof Date ? value.toISOString() : value;
    }
    return obj;
  });

  return { rows, columns, rowCount: rows.length };
}

function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new WorkspaceDuckDBError(
          `Query exceeded timeout of ${ms}ms`,
          "QUERY_TIMEOUT",
          true
        )
      );
    }, ms);
  });
}

export function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new WorkspaceDuckDBError(
        "Non-finite number values are not allowed in SQL",
        "INVALID_VALUE",
        false
      );
    }
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/;

export function sanitizeIdentifier(name: string): string {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new WorkspaceDuckDBError(
      `Invalid SQL identifier: "${name}". Must start with a letter or underscore and contain only alphanumeric characters and underscores (max 128 chars).`,
      "INVALID_IDENTIFIER",
      false
    );
  }
  return name;
}

export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

const VALID_ORDER_DIRECTIONS = new Set(["ASC", "DESC"]);

export function sanitizeOrderBy(
  column: string,
  allowedColumns: ReadonlySet<string>,
  direction?: string
): string {
  if (!allowedColumns.has(column)) {
    throw new WorkspaceDuckDBError(
      `Invalid order column: "${column}". Allowed: ${[...allowedColumns].join(", ")}`,
      "INVALID_ORDER_COLUMN",
      false
    );
  }
  const dir = direction?.toUpperCase() ?? "DESC";
  if (!VALID_ORDER_DIRECTIONS.has(dir)) {
    throw new WorkspaceDuckDBError(
      `Invalid order direction: "${direction}". Use ASC or DESC.`,
      "INVALID_ORDER_DIRECTION",
      false
    );
  }
  return `${quoteIdentifier(column)} ${dir}`;
}

export function validateFilterClause(filter: string): void {
  const upper = filter.toUpperCase().trim();
  for (const keyword of DANGEROUS_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    if (pattern.test(upper)) {
      throw new WorkspaceDuckDBError(
        `Filter contains forbidden keyword: ${keyword}`,
        "FILTER_NOT_ALLOWED",
        false
      );
    }
  }
  if (upper.includes(";")) {
    throw new WorkspaceDuckDBError(
      "Filter must not contain semicolons",
      "FILTER_NOT_ALLOWED",
      false
    );
  }
}

export function buildParameterizedQuery(
  template: string,
  params: Record<string, unknown>
): string {
  return template.replace(/:(\w+)/g, (_, key) => {
    if (!(key in params)) {
      throw new WorkspaceDuckDBError(
        `Missing parameter: ${key}`,
        "INVALID_PARAMETER",
        false
      );
    }
    return escapeSqlValue(params[key]);
  });
}
