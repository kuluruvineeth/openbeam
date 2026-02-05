import {
  type DatabaseEngine,
  DatabaseEngineSchema,
  type DatabaseOperation,
  type DatabaseQueryNodeConfig,
  DatabaseQueryNodeConfigSchema,
  type QueryOutputFormat,
  type QueryParameter,
} from "@openplane/types/canvas";
import type { Pool as MySqlPool, PoolConnection } from "mysql2/promise";
import { createPool } from "mysql2/promise";
import { type QueryResult as PgQueryResult, Pool, type PoolClient } from "pg";
import { z } from "zod";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

type ConnectionConfig = {
  url: string;
  engine: DatabaseEngine;
  readOnly?: boolean;
  maxConnections?: number;
  ssl?: boolean;
};

type QueryResult = {
  rows: unknown[];
  rowCount: number;
  fields?: string[];
  raw: unknown;
};

type DatabaseQueryOutput = {
  data: unknown;
  rows: unknown[];
  totalRows: number;
  returnedRows: number;
  truncated: boolean;
  fields?: string[];
  durationMs: number;
  outputFormat: QueryOutputFormat;
  engine: DatabaseEngine;
  operation: DatabaseOperation;
  error?: string;
};

const CONNECTIONS_ENV = "OPENPLANE_CANVAS_DB_CONNECTIONS";
const CONNECTION_ENV_PREFIX = "OPENPLANE_CANVAS_DB_CONNECTION_";
const SUPPORTED_ENGINES = new Set<DatabaseEngine>([
  "postgresql",
  "mysql",
  "mariadb",
]);
const READ_ONLY_PREFIXES = new Set([
  "select",
  "with",
  "show",
  "describe",
  "explain",
  "pragma",
]);
const NUMBER_REGEX = /^-?\d+(?:\.\d+)?$/;
const LEADING_KEYWORD_REGEX = /^([a-zA-Z]+)/;
const PARAM_PREFIX_REGEX = /^[@:]/;
const SQL_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const ConnectionConfigSchema = z.object({
  url: z.string().min(1),
  engine: DatabaseEngineSchema,
  readOnly: z.boolean().optional(),
  maxConnections: z.number().int().positive().optional(),
  ssl: z.boolean().optional(),
});

const postgresPools = new Map<string, Pool>();
const mysqlPools = new Map<string, MySqlPool>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateIdentifier(value: string, label: string): void {
  if (!SQL_IDENTIFIER_REGEX.test(value)) {
    throw new Error(
      `Invalid ${label}: must start with letter or underscore and contain only alphanumeric characters and underscores`
    );
  }
}

function normalizeEnvKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}

function parseConnectionValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  return trimmed;
}

function parseConnectionConfig(
  raw: unknown,
  fallbackEngine: DatabaseEngine
): ConnectionConfig {
  if (typeof raw === "string") {
    return ConnectionConfigSchema.parse({
      url: raw,
      engine: fallbackEngine,
    });
  }
  if (!isRecord(raw)) {
    throw new Error("Invalid database connection configuration");
  }
  const engine = raw.engine ?? fallbackEngine;
  return ConnectionConfigSchema.parse({
    ...raw,
    engine,
  });
}

function resolveConnectionConfig(
  connectionId: string,
  fallbackEngine: DatabaseEngine
): ConnectionConfig {
  const connectionsRaw = process.env[CONNECTIONS_ENV];
  if (connectionsRaw) {
    const parsed = JSON.parse(connectionsRaw);
    if (!isRecord(parsed)) {
      throw new Error("Invalid database connections configuration");
    }
    if (connectionId in parsed) {
      return parseConnectionConfig(parsed[connectionId], fallbackEngine);
    }
  }

  const envKey = `${CONNECTION_ENV_PREFIX}${normalizeEnvKey(connectionId)}`;
  const raw = process.env[envKey];
  if (raw) {
    const parsed = parseConnectionValue(raw);
    return parseConnectionConfig(parsed, fallbackEngine);
  }

  throw new Error(`Database connection "${connectionId}" is not configured`);
}

function ensureEngineSupported(engine: DatabaseEngine): void {
  if (!SUPPORTED_ENGINES.has(engine)) {
    throw new Error(`Unsupported database engine: ${engine}`);
  }
}

function normalizeQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Query is required");
  }
  const withoutTrailing = trimmed.endsWith(";")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  if (!withoutTrailing) {
    throw new Error("Query is required");
  }
  if (withoutTrailing.includes(";")) {
    throw new Error("Multiple statements are not supported");
  }
  return withoutTrailing;
}

function stripLeadingComments(sql: string): string {
  let text = sql.trimStart();
  while (text.startsWith("--") || text.startsWith("/*")) {
    if (text.startsWith("--")) {
      const newline = text.indexOf("\n");
      if (newline === -1) {
        return "";
      }
      text = text.slice(newline + 1).trimStart();
      continue;
    }
    const end = text.indexOf("*/");
    if (end === -1) {
      return "";
    }
    text = text.slice(end + 2).trimStart();
  }
  return text;
}

function isReadOnlyQuery(query: string): boolean {
  const stripped = stripLeadingComments(query);
  if (!stripped) {
    return false;
  }
  const match = stripped.match(LEADING_KEYWORD_REGEX);
  if (!match) {
    return false;
  }
  return READ_ONLY_PREFIXES.has(match[1]?.toLowerCase() ?? "");
}

function parseParameterValue(param: QueryParameter, value: unknown): unknown {
  if (param.type === "null") {
    return null;
  }
  const resolvedValue = value === undefined ? param.value : value;

  if (param.type === "string") {
    return typeof resolvedValue === "string"
      ? resolvedValue
      : String(resolvedValue);
  }

  if (param.type === "number") {
    if (typeof resolvedValue === "number") {
      return resolvedValue;
    }
    if (
      typeof resolvedValue === "string" &&
      NUMBER_REGEX.test(resolvedValue.trim())
    ) {
      return Number(resolvedValue);
    }
    throw new Error(`Invalid number for parameter "${param.name}"`);
  }

  if (param.type === "boolean") {
    if (typeof resolvedValue === "boolean") {
      return resolvedValue;
    }
    if (typeof resolvedValue === "string") {
      const normalized = resolvedValue.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
    throw new Error(`Invalid boolean for parameter "${param.name}"`);
  }

  if (param.type === "json") {
    if (typeof resolvedValue !== "string") {
      return resolvedValue;
    }
    const trimmed = resolvedValue.trim();
    if (!trimmed) {
      throw new Error(`Invalid JSON for parameter "${param.name}"`);
    }
    return JSON.parse(trimmed);
  }

  if (resolvedValue === undefined) {
    throw new Error(`Missing value for parameter "${param.name}"`);
  }
  return resolvedValue;
}

function resolveParameterOverride(
  param: QueryParameter,
  inputItem: unknown,
  index: number,
  paramCount: number
): unknown {
  if (isRecord(inputItem)) {
    if (param.name in inputItem) {
      return inputItem[param.name];
    }
    const normalized = param.name.replace(PARAM_PREFIX_REGEX, "");
    if (normalized in inputItem) {
      return inputItem[normalized];
    }
  }
  if (Array.isArray(inputItem) && index < inputItem.length) {
    return inputItem[index];
  }
  if (
    paramCount === 1 &&
    inputItem !== undefined &&
    !Array.isArray(inputItem) &&
    !isRecord(inputItem)
  ) {
    return inputItem;
  }
  return;
}

function resolveParameters(
  params: QueryParameter[],
  inputItem: unknown,
  allowFallback = false
): unknown[] {
  if (params.length === 0) {
    if (allowFallback && Array.isArray(inputItem)) {
      return inputItem;
    }
    return [];
  }
  return params.map((param, index) =>
    parseParameterValue(
      param,
      resolveParameterOverride(param, inputItem, index, params.length)
    )
  );
}

function parseLiteralValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  const lowered = trimmed.toLowerCase();
  if (lowered === "null") {
    return null;
  }
  if (lowered === "true") {
    return true;
  }
  if (lowered === "false") {
    return false;
  }
  if (NUMBER_REGEX.test(trimmed)) {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return JSON.parse(trimmed);
  }
  return value;
}

function resolveValueEntries(
  values: Record<string, string> | undefined,
  inputItem: unknown
): [string, unknown][] {
  if (values && Object.keys(values).length > 0) {
    return Object.entries(values).map(([key, value]) => [
      key.trim(),
      parseLiteralValue(value),
    ]);
  }
  if (isRecord(inputItem)) {
    return Object.entries(inputItem).map(([key, value]) => [key.trim(), value]);
  }
  return [];
}

function buildPlaceholders(
  engine: DatabaseEngine,
  count: number,
  offset: number
): string[] {
  if (engine === "postgresql") {
    return Array.from({ length: count }, (_, index) => `$${index + offset}`);
  }
  return Array.from({ length: count }, () => "?");
}

function offsetPostgresPlaceholders(clause: string, offset: number): string {
  if (offset === 0) {
    return clause;
  }
  return clause.replace(/\$(\d+)/g, (_, value) => {
    const next = Number(value) + offset;
    return `$${next}`;
  });
}

function buildSelectQuery(params: {
  table: string;
  columns?: string[];
  whereClause?: string;
  orderBy?: string;
  engine: DatabaseEngine;
}): string {
  const table = params.table.trim();
  if (!table) {
    throw new Error("Table is required");
  }
  validateIdentifier(table, "table name");

  const columns =
    params.columns && params.columns.length > 0
      ? params.columns
          .map((col) => col.trim())
          .filter(Boolean)
          .join(", ")
      : "*";
  let sql = `SELECT ${columns || "*"} FROM ${table}`;
  if (params.whereClause?.trim()) {
    const clause =
      params.engine === "postgresql"
        ? offsetPostgresPlaceholders(params.whereClause.trim(), 0)
        : params.whereClause.trim();
    sql += ` WHERE ${clause}`;
  }
  if (params.orderBy?.trim()) {
    sql += ` ORDER BY ${params.orderBy.trim()}`;
  }
  return sql;
}

function buildInsertQuery(params: {
  table: string;
  values: [string, unknown][];
  engine: DatabaseEngine;
}): { sql: string; values: unknown[] } {
  const table = params.table.trim();
  if (!table) {
    throw new Error("Table is required");
  }
  validateIdentifier(table, "table name");

  const entries = params.values;
  if (entries.length === 0) {
    throw new Error("Insert values are required");
  }
  const columns = entries.map(([key]) => key.trim());
  if (columns.some((col) => !col)) {
    throw new Error("Insert values require column names");
  }
  for (const col of columns) {
    validateIdentifier(col, "column name");
  }

  const placeholders = buildPlaceholders(params.engine, columns.length, 1);
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
  return { sql, values: entries.map(([, value]) => value) };
}

function buildUpdateQuery(params: {
  table: string;
  values: [string, unknown][];
  whereClause?: string;
  engine: DatabaseEngine;
}): { sql: string; values: unknown[]; valueCount: number } {
  const table = params.table.trim();
  if (!table) {
    throw new Error("Table is required");
  }
  validateIdentifier(table, "table name");

  const entries = params.values;
  if (entries.length === 0) {
    throw new Error("Update values are required");
  }
  const columns = entries.map(([key]) => key.trim());
  if (columns.some((col) => !col)) {
    throw new Error("Update values require column names");
  }
  for (const col of columns) {
    validateIdentifier(col, "column name");
  }

  const placeholders = buildPlaceholders(params.engine, columns.length, 1);
  const assignments = columns.map(
    (column, index) => `${column} = ${placeholders[index] ?? ""}`
  );
  let sql = `UPDATE ${table} SET ${assignments.join(", ")}`;
  if (params.whereClause?.trim()) {
    const clause =
      params.engine === "postgresql"
        ? offsetPostgresPlaceholders(params.whereClause.trim(), columns.length)
        : params.whereClause.trim();
    sql += ` WHERE ${clause}`;
  }
  return {
    sql,
    values: entries.map(([, value]) => value),
    valueCount: columns.length,
  };
}

function buildDeleteQuery(params: {
  table: string;
  whereClause?: string;
  engine: DatabaseEngine;
}): { sql: string } {
  const table = params.table.trim();
  if (!table) {
    throw new Error("Table is required");
  }
  validateIdentifier(table, "table name");

  let sql = `DELETE FROM ${table}`;
  if (params.whereClause?.trim()) {
    const clause =
      params.engine === "postgresql"
        ? offsetPostgresPlaceholders(params.whereClause.trim(), 0)
        : params.whereClause.trim();
    sql += ` WHERE ${clause}`;
  }
  return { sql };
}

function buildUpsertQuery(params: {
  table: string;
  values: [string, unknown][];
  conflictColumn?: string;
  engine: DatabaseEngine;
}): { sql: string; values: unknown[] } {
  const table = params.table.trim();
  if (!table) {
    throw new Error("Table is required");
  }
  validateIdentifier(table, "table name");

  const entries = params.values;
  if (entries.length === 0) {
    throw new Error("Upsert values are required");
  }
  const conflictColumn = params.conflictColumn?.trim();
  if (!conflictColumn) {
    throw new Error("Upsert requires a conflict column");
  }
  validateIdentifier(conflictColumn, "conflict column");

  const columns = entries.map(([key]) => key.trim());
  if (columns.some((col) => !col)) {
    throw new Error("Upsert values require column names");
  }
  for (const col of columns) {
    validateIdentifier(col, "column name");
  }

  const placeholders = buildPlaceholders(params.engine, columns.length, 1);
  const insertSql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
  const updateColumns = columns.filter((col) => col !== conflictColumn);
  if (updateColumns.length === 0) {
    throw new Error("Upsert requires a non-conflict update column");
  }

  if (params.engine === "postgresql") {
    const updates = updateColumns.map(
      (column) => `${column} = EXCLUDED.${column}`
    );
    return {
      sql: `${insertSql} ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updates.join(", ")}`,
      values: entries.map(([, value]) => value),
    };
  }

  const updates = updateColumns.map(
    (column) => `${column} = VALUES(${column})`
  );
  return {
    sql: `${insertSql} ON DUPLICATE KEY UPDATE ${updates.join(", ")}`,
    values: entries.map(([, value]) => value),
  };
}

function buildQueryPlan(params: {
  config: DatabaseQueryNodeConfig;
  engine: DatabaseEngine;
  inputItem: unknown;
}): { sql: string; values: unknown[] } {
  const config = params.config;
  const engine = params.engine;

  if (config.operation === "execute_query") {
    const sql = normalizeQuery(config.query);
    const paramValues = resolveParameters(
      config.parameters,
      params.inputItem,
      true
    );
    return { sql, values: paramValues };
  }

  const valueEntries = resolveValueEntries(config.values, params.inputItem);

  switch (config.operation) {
    case "select": {
      const sql = buildSelectQuery({
        table: config.table ?? "",
        columns: config.columns,
        whereClause: config.whereClause,
        orderBy: config.orderBy,
        engine,
      });
      const paramValues = resolveParameters(
        config.parameters,
        params.inputItem
      );
      return { sql, values: paramValues };
    }
    case "insert": {
      const result = buildInsertQuery({
        table: config.table ?? "",
        values: valueEntries,
        engine,
      });
      return {
        sql: result.sql,
        values: result.values,
      };
    }
    case "update": {
      const result = buildUpdateQuery({
        table: config.table ?? "",
        values: valueEntries,
        whereClause: config.whereClause,
        engine,
      });
      const paramsValues = resolveParameters(
        config.parameters,
        params.inputItem
      );
      return {
        sql: result.sql,
        values: [...result.values, ...paramsValues],
      };
    }
    case "upsert": {
      const result = buildUpsertQuery({
        table: config.table ?? "",
        values: valueEntries,
        conflictColumn: config.conflictColumn,
        engine,
      });
      return {
        sql: result.sql,
        values: result.values,
      };
    }
    case "delete": {
      const result = buildDeleteQuery({
        table: config.table ?? "",
        whereClause: config.whereClause,
        engine,
      });
      const paramValues = resolveParameters(
        config.parameters,
        params.inputItem
      );
      return { sql: result.sql, values: paramValues };
    }
    default:
      throw new Error(`Unsupported database operation: ${config.operation}`);
  }
}

function truncateRows(
  rows: unknown[],
  maxRows: number
): { rows: unknown[]; truncated: boolean } {
  if (rows.length <= maxRows) {
    return { rows, truncated: false };
  }
  return { rows: rows.slice(0, maxRows), truncated: true };
}

function resolveOutput(
  outputFormat: QueryOutputFormat,
  rows: unknown[],
  rowCount: number,
  raw: unknown
): unknown {
  switch (outputFormat) {
    case "rows":
      return rows;
    case "first_row":
      return rows[0] ?? null;
    case "count":
      return rowCount;
    case "raw":
      return raw;
    default:
      return rows;
  }
}

function buildOutput(params: {
  result: QueryResult;
  outputFormat: QueryOutputFormat;
  engine: DatabaseEngine;
  operation: DatabaseOperation;
  durationMs: number;
  maxRows: number;
  error?: string;
}): DatabaseQueryOutput {
  const truncated = truncateRows(params.result.rows, params.maxRows);
  const totalRows = params.result.rowCount;
  const returnedRows = truncated.rows.length;
  const data = resolveOutput(
    params.outputFormat,
    truncated.rows,
    totalRows,
    params.result.raw
  );
  return {
    data,
    rows: truncated.rows,
    totalRows,
    returnedRows,
    truncated: truncated.truncated,
    fields: params.result.fields,
    durationMs: params.durationMs,
    outputFormat: params.outputFormat,
    engine: params.engine,
    operation: params.operation,
    error: params.error,
  };
}

function buildErrorOutput(params: {
  outputFormat: QueryOutputFormat;
  engine: DatabaseEngine;
  operation: DatabaseOperation;
  durationMs: number;
  error: string;
  maxRows: number;
}): DatabaseQueryOutput {
  const emptyResult: QueryResult = {
    rows: [],
    rowCount: 0,
    raw: null,
  };
  return buildOutput({
    result: emptyResult,
    outputFormat: params.outputFormat,
    engine: params.engine,
    operation: params.operation,
    durationMs: params.durationMs,
    maxRows: params.maxRows,
    error: params.error,
  });
}

function getPostgresPool(config: ConnectionConfig): Pool {
  const key = JSON.stringify({
    url: config.url,
    maxConnections: config.maxConnections ?? null,
    ssl: config.ssl ?? null,
  });
  const existing = postgresPools.get(key);
  if (existing) {
    return existing;
  }
  const pool = new Pool({
    connectionString: config.url,
    max: config.maxConnections,
    ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
  });
  postgresPools.set(key, pool);
  return pool;
}

async function executePostgresQuery(params: {
  config: ConnectionConfig;
  sql: string;
  values: unknown[];
  timeoutMs: number;
  client?: PoolClient;
}): Promise<PgQueryResult> {
  if (params.client) {
    if (params.timeoutMs > 0) {
      await params.client.query("SET LOCAL statement_timeout TO $1", [
        params.timeoutMs,
      ]);
    }
    return await params.client.query(params.sql, params.values);
  }

  const pool = getPostgresPool(params.config);
  const client = await pool.connect();
  try {
    if (params.timeoutMs > 0) {
      await client.query("SET statement_timeout TO $1", [params.timeoutMs]);
    }
    const result = await client.query(params.sql, params.values);
    if (params.timeoutMs > 0) {
      await client.query("SET statement_timeout TO DEFAULT");
    }
    return result;
  } finally {
    client.release();
  }
}

async function executePostgresTransaction<T>(params: {
  config: ConnectionConfig;
  timeoutMs: number;
  run: (client: PoolClient) => Promise<T>;
}): Promise<T> {
  const pool = getPostgresPool(params.config);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (params.timeoutMs > 0) {
      await client.query("SET LOCAL statement_timeout TO $1", [
        params.timeoutMs,
      ]);
    }
    const result = await params.run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function getMysqlPool(config: ConnectionConfig): MySqlPool {
  const key = JSON.stringify({
    url: config.url,
    maxConnections: config.maxConnections ?? null,
    ssl: config.ssl ?? null,
  });
  const existing = mysqlPools.get(key);
  if (existing) {
    return existing;
  }
  const pool = createPool({
    uri: config.url,
    connectionLimit: config.maxConnections,
    ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
  });
  mysqlPools.set(key, pool);
  return pool;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (timeoutMs <= 0) {
    return await promise;
  }
  let timeoutId: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Database query timed out"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function executeMysqlQuery(params: {
  config: ConnectionConfig;
  sql: string;
  values: unknown[];
  connection?: PoolConnection;
  timeoutMs: number;
}): Promise<{
  rows: unknown;
  fields: unknown;
}> {
  let queryRows: unknown;
  let queryFields: unknown;
  if (params.connection) {
    [queryRows, queryFields] = await withTimeout(
      params.connection.query(params.sql, params.values),
      params.timeoutMs
    );
    return { rows: queryRows, fields: queryFields };
  }
  const pool = getMysqlPool(params.config);
  [queryRows, queryFields] = await withTimeout(
    pool.query(params.sql, params.values),
    params.timeoutMs
  );
  return { rows: queryRows, fields: queryFields };
}

async function executeMysqlTransaction<T>(params: {
  config: ConnectionConfig;
  run: (connection: PoolConnection) => Promise<T>;
}): Promise<T> {
  const pool = getMysqlPool(params.config);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await params.run(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function normalizeMysqlResult(result: {
  rows: unknown;
  fields: unknown;
}): QueryResult {
  const rows = Array.isArray(result.rows) ? result.rows : [];
  let rowCount = 0;
  if (Array.isArray(result.rows)) {
    rowCount = result.rows.length;
  } else if (isRecord(result.rows)) {
    rowCount = Number(
      (result.rows as { affectedRows?: unknown }).affectedRows ?? 0
    );
  }
  const fields = Array.isArray(result.fields)
    ? result.fields
        .map((field) =>
          isRecord(field) && typeof field.name === "string" ? field.name : null
        )
        .filter((field): field is string => Boolean(field))
    : undefined;
  return {
    rows,
    rowCount,
    fields,
    raw: result,
  };
}

function normalizePostgresResult(result: PgQueryResult): QueryResult {
  return {
    rows: result.rows ?? [],
    rowCount:
      typeof result.rowCount === "number"
        ? result.rowCount
        : result.rows.length,
    fields: result.fields?.map((field) => field.name),
    raw: result,
  };
}

function resolveBatchItems(
  batchMode: DatabaseQueryNodeConfig["batchMode"],
  input: unknown
): unknown[] {
  if (batchMode !== "single" && Array.isArray(input)) {
    return input;
  }
  return [input];
}

function ensureReadOnlyAccess(params: {
  config: DatabaseQueryNodeConfig;
  engine: DatabaseEngine;
}): void {
  if (!params.config.readOnly) {
    return;
  }
  if (params.config.operation === "execute_query") {
    const normalized = normalizeQuery(params.config.query);
    if (!isReadOnlyQuery(normalized)) {
      throw new Error("Read-only connections cannot execute write queries");
    }
    return;
  }
  if (params.config.operation !== "select") {
    throw new Error("Read-only connections cannot execute write operations");
  }
}

async function executeSinglePlan(params: {
  config: DatabaseQueryNodeConfig;
  connection: ConnectionConfig;
  engine: DatabaseEngine;
  inputItem: unknown;
  client?: PoolClient;
  mysqlConnection?: PoolConnection;
}): Promise<DatabaseQueryOutput> {
  const plan = buildQueryPlan({
    config: params.config,
    engine: params.engine,
    inputItem: params.inputItem,
  });
  const startedAt = Date.now();
  if (params.engine === "postgresql") {
    const result = await executePostgresQuery({
      config: params.connection,
      sql: plan.sql,
      values: plan.values,
      timeoutMs: params.config.timeout,
      client: params.client,
    });
    return buildOutput({
      result: normalizePostgresResult(result),
      outputFormat: params.config.outputFormat,
      engine: params.engine,
      operation: params.config.operation,
      durationMs: Date.now() - startedAt,
      maxRows: params.config.maxRows,
    });
  }

  const result = await executeMysqlQuery({
    config: params.connection,
    sql: plan.sql,
    values: plan.values,
    connection: params.mysqlConnection,
    timeoutMs: params.config.timeout,
  });
  return buildOutput({
    result: normalizeMysqlResult(result),
    outputFormat: params.config.outputFormat,
    engine: params.engine,
    operation: params.config.operation,
    durationMs: Date.now() - startedAt,
    maxRows: params.config.maxRows,
  });
}

export const databaseQueryExecutor: CanvasNodeExecutor = async ({
  node,
  input,
}) => {
  const startedAt = Date.now();
  let config: DatabaseQueryNodeConfig | undefined;
  try {
    const parsedConfig = DatabaseQueryNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    if (!parsedConfig.connectionId.trim()) {
      throw new Error("Connection is required");
    }

    const connection = resolveConnectionConfig(
      parsedConfig.connectionId,
      parsedConfig.engine
    );
    const engine = connection.engine;
    if (engine !== parsedConfig.engine) {
      throw new Error(
        `Database engine mismatch for "${parsedConfig.connectionId}": expected ${parsedConfig.engine}, got ${engine}`
      );
    }
    ensureEngineSupported(engine);

    const resolvedConfig: DatabaseQueryNodeConfig = {
      ...parsedConfig,
      readOnly: parsedConfig.readOnly || connection.readOnly === true,
    };
    config = resolvedConfig;

    ensureReadOnlyAccess({ config: resolvedConfig, engine });

    const batchItems = resolveBatchItems(resolvedConfig.batchMode, input);

    if (resolvedConfig.batchMode === "transaction" && batchItems.length > 1) {
      if (engine === "postgresql") {
        const results = await executePostgresTransaction({
          config: connection,
          timeoutMs: resolvedConfig.timeout,
          run: async (client) => {
            const outputs: DatabaseQueryOutput[] = [];
            for (const item of batchItems) {
              outputs.push(
                await executeSinglePlan({
                  config: resolvedConfig,
                  connection,
                  engine,
                  inputItem: item,
                  client,
                })
              );
            }
            return outputs;
          },
        });
        return results;
      }

      const results = await executeMysqlTransaction({
        config: connection,
        run: async (mysqlConnection) => {
          const outputs: DatabaseQueryOutput[] = [];
          for (const item of batchItems) {
            outputs.push(
              await executeSinglePlan({
                config: resolvedConfig,
                connection,
                engine,
                inputItem: item,
                mysqlConnection,
              })
            );
          }
          return outputs;
        },
      });
      return results;
    }

    if (batchItems.length > 1) {
      const outputs = await Promise.all(
        batchItems.map((item) =>
          executeSinglePlan({
            config: resolvedConfig,
            connection,
            engine,
            inputItem: item,
          })
        )
      );
      return outputs;
    }

    const result = await executeSinglePlan({
      config: resolvedConfig,
      connection,
      engine,
      inputItem: batchItems[0],
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (config?.continueOnError) {
      return buildErrorOutput({
        outputFormat: config.outputFormat,
        engine: config.engine ?? "postgresql",
        operation: config.operation,
        durationMs: Date.now() - startedAt,
        error: message,
        maxRows: config.maxRows,
      });
    }
    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
