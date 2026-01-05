import type { DuckDBClient } from "./client";
import { DuckDBApiError, DuckDBErrorCodes, type QueryResult } from "./types";

export interface ParquetExportOptions {
  compression?: "zstd" | "snappy" | "gzip" | "none";
  rowGroupSize?: number;
  includeSchema?: boolean;
}

export interface ParquetMetadata {
  rowCount: number;
  columnCount: number;
  compressionCodec: string;
  fileSizeBytes: number;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  metadata?: ParquetMetadata;
  error?: string;
}

const DEFAULT_COMPRESSION = "zstd";
const DEFAULT_ROW_GROUP_SIZE = 100_000;

export function buildParquetExportSql(
  viewName: string,
  outputPath: string,
  options?: ParquetExportOptions
): string {
  const compression = options?.compression ?? DEFAULT_COMPRESSION;
  const rowGroupSize = options?.rowGroupSize ?? DEFAULT_ROW_GROUP_SIZE;

  return `
    COPY "${viewName}" TO '${outputPath}'
    (FORMAT PARQUET, COMPRESSION '${compression}', ROW_GROUP_SIZE ${rowGroupSize})
  `.trim();
}

export function buildParquetQuerySql(
  parquetPath: string,
  selectColumns?: string[],
  whereClause?: string,
  limit?: number
): string {
  const columns = selectColumns?.length ? selectColumns.join(", ") : "*";
  let sql = `SELECT ${columns} FROM read_parquet('${parquetPath}')`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  if (limit) {
    sql += ` LIMIT ${limit}`;
  }

  return sql;
}

export function buildMultiParquetQuerySql(
  parquetPaths: string[],
  selectColumns?: string[],
  whereClause?: string,
  limit?: number
): string {
  if (parquetPaths.length === 0) {
    throw new DuckDBApiError({
      message: "At least one parquet path required",
      code: DuckDBErrorCodes.INTERNAL_ERROR,
      retryable: false,
    });
  }

  const pathList = parquetPaths.map((p) => `'${p}'`).join(", ");
  const columns = selectColumns?.length ? selectColumns.join(", ") : "*";

  let sql = `SELECT ${columns} FROM read_parquet([${pathList}])`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  if (limit) {
    sql += ` LIMIT ${limit}`;
  }

  return sql;
}

export function buildParquetGlobQuerySql(
  pattern: string,
  selectColumns?: string[],
  whereClause?: string,
  limit?: number
): string {
  const columns = selectColumns?.length ? selectColumns.join(", ") : "*";

  let sql = `SELECT ${columns} FROM read_parquet('${pattern}', hive_partitioning=true)`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  if (limit) {
    sql += ` LIMIT ${limit}`;
  }

  return sql;
}

export async function queryParquetFromS3(
  client: DuckDBClient,
  documentId: string,
  s3Path: string,
  options?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    endpoint?: string;
  }
): Promise<QueryResult> {
  const setupSql = buildS3ConfigSql(options);

  const viewName = `parquet_${documentId.replace(/-/g, "_")}`;
  const querySql = `
    ${setupSql}
    CREATE OR REPLACE VIEW "${viewName}" AS
    SELECT * FROM read_parquet('${s3Path}')
  `;

  await client.query(documentId, querySql, viewName);

  return client.query(
    documentId,
    `SELECT * FROM "${viewName}" LIMIT 1000`,
    viewName
  );
}

function buildS3ConfigSql(options?: {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  endpoint?: string;
}): string {
  const statements: string[] = [];

  if (options?.accessKeyId && options?.secretAccessKey) {
    statements.push(`SET s3_access_key_id='${options.accessKeyId}'`);
    statements.push(`SET s3_secret_access_key='${options.secretAccessKey}'`);
  }

  if (options?.region) {
    statements.push(`SET s3_region='${options.region}'`);
  }

  if (options?.endpoint) {
    statements.push(`SET s3_endpoint='${options.endpoint}'`);
    statements.push("SET s3_url_style='path'");
  }

  return statements.length > 0 ? `${statements.join(";\n")};\n` : "";
}

export function getParquetSchema(filePath: string): string {
  return `SELECT * FROM parquet_schema('${filePath}')`;
}

export function getParquetMetadataSql(filePath: string): string {
  return `SELECT * FROM parquet_metadata('${filePath}')`;
}

export function estimateParquetSize(
  rowCount: number,
  avgRowSizeBytes: number,
  compression: ParquetExportOptions["compression"] = "zstd"
): number {
  const compressionRatios: Record<string, number> = {
    none: 1.0,
    snappy: 0.5,
    gzip: 0.3,
    zstd: 0.25,
  };

  const ratio = compressionRatios[compression] ?? 0.25;
  return Math.ceil(rowCount * avgRowSizeBytes * ratio);
}
