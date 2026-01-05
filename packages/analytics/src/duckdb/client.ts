import type {
  DuckDBConnection,
  DuckDBInstance,
  DuckDBMaterializedResult,
} from "@duckdb/node-api";
import {
  DEFAULT_DUCKDB_CONFIG,
  DEFAULT_QUERY_OPTIONS,
  type DuckDBResourceConfig,
  type FileLimits,
  getConfigFromEnv,
  mergeConfig,
  PRODUCTION_FILE_LIMITS,
} from "./config";
import { getMetricsCollector, type MetricsCollector } from "./metrics";
import {
  DuckDBApiError,
  DuckDBErrorCodes,
  type FileValidationResult,
  type QueryExecutionOptions,
  type QueryResult,
  type SpreadsheetColumn,
} from "./types";
import {
  addLimitClause,
  assertValidSQL,
  escapeSqlStringLiteral,
  sanitizeTableName,
} from "./validation";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

export interface DuckDBClientConfig {
  resourceConfig?: Partial<DuckDBResourceConfig>;
  fileLimits?: Partial<FileLimits>;
  queryOptions?: Partial<QueryExecutionOptions>;
  metricsCollector?: MetricsCollector;
}

export interface DuckDBClient {
  initialize(): Promise<void>;
  loadSpreadsheet(
    documentId: string,
    fileBuffer: Buffer,
    fileType: "csv" | "xlsx" | "parquet",
    sheet?: string
  ): Promise<{ viewName: string; validation: FileValidationResult }>;
  query(
    documentId: string,
    sql: string,
    viewName: string,
    options?: Partial<QueryExecutionOptions>
  ): Promise<QueryResult>;
  getSchema(viewName: string): Promise<SpreadsheetColumn[]>;
  getSampleData(
    viewName: string,
    limit?: number
  ): Promise<Record<string, unknown>[]>;
  unloadSpreadsheet(viewName: string): Promise<void>;
  close(): Promise<void>;
  isInitialized(): boolean;
}

class QueryTimeoutError extends Error {
  readonly code = "QUERY_TIMEOUT";
  readonly retryable = true;

  constructor(timeoutMs: number) {
    super(`Query exceeded timeout of ${timeoutMs}ms`);
    this.name = "QueryTimeoutError";
  }
}

async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject(new QueryTimeoutError(timeoutMs));
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resultToRecords(
  result: DuckDBMaterializedResult
): Promise<Record<string, unknown>[]> {
  const columns = result.columnNames();
  const rows = await result.getRows();

  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

function inferColumnType(
  values: unknown[]
): "string" | "number" | "date" | "boolean" | "unknown" {
  const nonNull = values.filter((v) => v !== null && v !== undefined);
  if (nonNull.length === 0) {
    return "unknown";
  }

  const sample = nonNull[0];

  if (typeof sample === "number" || typeof sample === "bigint") {
    return "number";
  }

  if (typeof sample === "boolean") {
    return "boolean";
  }

  if (sample instanceof Date) {
    return "date";
  }

  if (typeof sample === "string" && ISO_DATE_PATTERN.test(sample)) {
    return "date";
  }

  return "string";
}

export function createDuckDBClient(
  config: DuckDBClientConfig = {}
): DuckDBClient {
  const resourceConfig = mergeConfig(DEFAULT_DUCKDB_CONFIG, {
    ...getConfigFromEnv(),
    ...config.resourceConfig,
  });

  const fileLimits: FileLimits = {
    ...PRODUCTION_FILE_LIMITS,
    ...config.fileLimits,
  };

  const queryOptions: QueryExecutionOptions = {
    ...DEFAULT_QUERY_OPTIONS,
    ...config.queryOptions,
  };

  const metrics = config.metricsCollector ?? getMetricsCollector();

  let instance: DuckDBInstance | null = null;
  let connection: DuckDBConnection | null = null;
  let initialized = false;
  const loadedViews = new Set<string>();

  async function initialize(): Promise<void> {
    if (initialized) {
      return;
    }

    try {
      const { DuckDBInstance: DuckDB } = await import("@duckdb/node-api");

      instance = await DuckDB.create(":memory:", {
        max_memory: `${resourceConfig.maxMemoryMb}MB`,
        threads: String(resourceConfig.threads),
        temp_directory: resourceConfig.tempDirectory,
        access_mode: resourceConfig.accessMode,
      });

      connection = await instance.connect();
      initialized = true;
      metrics.setActiveConnections(1);
    } catch (error) {
      throw new DuckDBApiError({
        message: `Failed to initialize DuckDB: ${error instanceof Error ? error.message : String(error)}`,
        code: DuckDBErrorCodes.CONNECTION_FAILED,
        retryable: true,
      });
    }
  }

  async function validateFileLimits(
    viewName: string,
    fileSize: number
  ): Promise<FileValidationResult> {
    if (!connection) {
      throw new DuckDBApiError({
        message: "DuckDB not initialized",
        code: DuckDBErrorCodes.CONNECTION_FAILED,
        retryable: false,
      });
    }

    if (fileSize > fileLimits.maxFileSizeBytes) {
      return {
        valid: false,
        reason: `File size ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds limit of ${fileLimits.maxFileSizeBytes / 1024 / 1024}MB`,
        fileSize,
      };
    }

    const countResult = await connection.run(
      `SELECT COUNT(*) as row_count FROM "${viewName}"`
    );
    const rows = await countResult.getRows();
    const rowCount = Number(rows[0]?.[0] ?? 0);

    if (rowCount > fileLimits.maxRowCount) {
      return {
        valid: false,
        reason: `Row count ${rowCount.toLocaleString()} exceeds limit of ${fileLimits.maxRowCount.toLocaleString()}`,
        rowCount,
      };
    }

    const schemaResult = await connection.run(`DESCRIBE "${viewName}"`);
    const schemaRows = await schemaResult.getRows();
    const columnCount = schemaRows.length;

    if (columnCount > fileLimits.maxColumnCount) {
      return {
        valid: false,
        reason: `Column count ${columnCount} exceeds limit of ${fileLimits.maxColumnCount}`,
        columnCount,
      };
    }

    return { valid: true, fileSize, rowCount, columnCount };
  }

  async function loadSpreadsheet(
    documentId: string,
    fileBuffer: Buffer,
    fileType: "csv" | "xlsx" | "parquet",
    sheet?: string
  ): Promise<{ viewName: string; validation: FileValidationResult }> {
    if (!connection) {
      throw new DuckDBApiError({
        message: "DuckDB not initialized",
        code: DuckDBErrorCodes.CONNECTION_FAILED,
        retryable: false,
      });
    }

    const viewName = sanitizeTableName(`data_${documentId.replace(/-/g, "_")}`);

    if (loadedViews.has(viewName)) {
      await connection.run(`DROP VIEW IF EXISTS "${viewName}"`);
      loadedViews.delete(viewName);
    }

    const base64Data = fileBuffer.toString("base64");

    let createViewSql: string;

    switch (fileType) {
      case "csv":
        createViewSql = `
          CREATE VIEW "${viewName}" AS
          SELECT * FROM read_csv_auto(
            decode('${base64Data}'::blob),
            header=true,
            auto_detect=true
          )
        `;
        break;

      case "xlsx": {
        const sheetParam = sheet
          ? `, sheet='${escapeSqlStringLiteral(sheet)}'`
          : "";
        createViewSql = `
          CREATE VIEW "${viewName}" AS
          SELECT * FROM read_xlsx(
            decode('${base64Data}'::blob)
            ${sheetParam}
          )
        `;
        break;
      }

      case "parquet":
        createViewSql = `
          CREATE VIEW "${viewName}" AS
          SELECT * FROM read_parquet(
            decode('${base64Data}'::blob)
          )
        `;
        break;

      default:
        throw new DuckDBApiError({
          message: `Unsupported file type: ${fileType}`,
          code: DuckDBErrorCodes.INTERNAL_ERROR,
          retryable: false,
        });
    }

    await connection.run(createViewSql);
    loadedViews.add(viewName);

    const validation = await validateFileLimits(viewName, fileBuffer.length);

    if (!validation.valid) {
      await connection.run(`DROP VIEW IF EXISTS "${viewName}"`);
      loadedViews.delete(viewName);
    }

    return { viewName, validation };
  }

  async function query(
    _documentId: string,
    sql: string,
    viewName: string,
    options?: Partial<QueryExecutionOptions>
  ): Promise<QueryResult> {
    if (!connection) {
      throw new DuckDBApiError({
        message: "DuckDB not initialized",
        code: DuckDBErrorCodes.CONNECTION_FAILED,
        retryable: false,
      });
    }

    const conn = connection;
    const opts = { ...queryOptions, ...options };

    assertValidSQL(sql, [viewName, "data"]);

    const finalSql = addLimitClause(sql, opts.maxResultRows);

    const startTime = performance.now();
    let status: "success" | "error" | "timeout" = "success";

    try {
      const result = await executeWithTimeout(
        async () => conn.run(finalSql),
        opts.timeoutMs
      );

      const rows = await resultToRecords(result);
      const columns = result.columnNames();
      const columnTypes: Record<string, string> = {};

      for (const col of columns) {
        columnTypes[col] = "unknown";
      }

      const countResult = await conn.run(`SELECT COUNT(*) FROM "${viewName}"`);
      const countRows = await countResult.getRows();
      const totalRows = Number(countRows[0]?.[0] ?? 0);

      const latencyMs = performance.now() - startTime;

      return {
        rows,
        columnTypes,
        rowCount: rows.length,
        totalRowsScanned: totalRows,
        executedSql: finalSql,
        latencyMs,
      };
    } catch (error) {
      if (error instanceof QueryTimeoutError) {
        status = "timeout";
        throw new DuckDBApiError({
          message: error.message,
          code: DuckDBErrorCodes.QUERY_TIMEOUT,
          retryable: true,
        });
      }

      status = "error";
      throw new DuckDBApiError({
        message: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: false,
      });
    } finally {
      const latencyMs = performance.now() - startTime;
      metrics.recordQuery(
        { teamId: "unknown", operation: "query", status },
        latencyMs
      );
    }
  }

  async function getSchema(viewName: string): Promise<SpreadsheetColumn[]> {
    if (!connection) {
      throw new DuckDBApiError({
        message: "DuckDB not initialized",
        code: DuckDBErrorCodes.CONNECTION_FAILED,
        retryable: false,
      });
    }

    const describeResult = await connection.run(`DESCRIBE "${viewName}"`);
    const schemaRows = await describeResult.getRows();

    const sampleResult = await connection.run(
      `SELECT * FROM "${viewName}" LIMIT 5`
    );
    const sampleRows = await resultToRecords(sampleResult);

    return schemaRows.map((row) => {
      const columnName = String(row[0]);
      const duckDbType = String(row[1]).toLowerCase();
      const nullable = row[2] !== "NO";

      const sampleValues = sampleRows.map((r) => r[columnName]);
      const inferredType = inferColumnType(sampleValues);

      let type: "string" | "number" | "date" | "boolean" | "unknown";
      if (
        duckDbType.includes("int") ||
        duckDbType.includes("float") ||
        duckDbType.includes("double") ||
        duckDbType.includes("decimal")
      ) {
        type = "number";
      } else if (duckDbType.includes("bool")) {
        type = "boolean";
      } else if (
        duckDbType.includes("date") ||
        duckDbType.includes("time") ||
        duckDbType.includes("timestamp")
      ) {
        type = "date";
      } else {
        type = inferredType;
      }

      return {
        name: columnName,
        type,
        nullable,
        sampleValues,
      };
    });
  }

  async function getSampleData(
    viewName: string,
    limit = 5
  ): Promise<Record<string, unknown>[]> {
    if (!connection) {
      throw new DuckDBApiError({
        message: "DuckDB not initialized",
        code: DuckDBErrorCodes.CONNECTION_FAILED,
        retryable: false,
      });
    }

    const result = await connection.run(
      `SELECT * FROM "${viewName}" LIMIT ${limit}`
    );
    return resultToRecords(result);
  }

  async function unloadSpreadsheet(viewName: string): Promise<void> {
    if (!connection) {
      return;
    }

    if (loadedViews.has(viewName)) {
      await connection.run(`DROP VIEW IF EXISTS "${viewName}"`);
      loadedViews.delete(viewName);
    }
  }

  async function close(): Promise<void> {
    for (const viewName of loadedViews) {
      try {
        await connection?.run(`DROP VIEW IF EXISTS "${viewName}"`);
      } catch {
        // Ignore cleanup errors
      }
    }
    loadedViews.clear();

    if (connection) {
      connection.closeSync();
      connection = null;
    }

    if (instance) {
      instance.closeSync();
      instance = null;
    }

    initialized = false;
    metrics.setActiveConnections(0);
  }

  function isInitialized(): boolean {
    return initialized;
  }

  return {
    initialize,
    loadSpreadsheet,
    query,
    getSchema,
    getSampleData,
    unloadSpreadsheet,
    close,
    isInitialized,
  };
}
