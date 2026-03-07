import type { WorkspaceExportConfig } from "@openbeam/types/services/workspace";
import type { WorkspaceDuckDB } from "./client";
import { WorkspaceDuckDBError } from "./client";
import {
  escapeSqlValue,
  quoteIdentifier,
  sanitizeIdentifier,
  validateFilterClause,
} from "./query";

export type ExportResult = {
  data: string;
  rowCount: number;
  format: string;
};

function buildSelectSQL(config: WorkspaceExportConfig): string {
  const safeViewName = `v_${sanitizeIdentifier(config.objectName)}`;
  const columns = config.fields?.length
    ? config.fields.map((f) => quoteIdentifier(f)).join(", ")
    : "*";

  let sql = `SELECT ${columns} FROM ${safeViewName}`;

  if (config.filter) {
    validateFilterClause(config.filter);
    sql += ` WHERE ${config.filter}`;
  }

  if (config.limit) {
    sql += ` LIMIT ${Number(config.limit)}`;
  }

  return sql;
}

async function resolveObjectByName(
  db: WorkspaceDuckDB,
  objectName: string
): Promise<string> {
  const objects = await db.query<{ id: string }>(
    `SELECT id FROM objects WHERE name = ${escapeSqlValue(objectName)}`
  );
  const object = objects[0];
  if (!object) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }
  return object.id;
}

export async function exportToCSV(
  db: WorkspaceDuckDB,
  config: WorkspaceExportConfig
): Promise<ExportResult> {
  await resolveObjectByName(db, config.objectName);

  const selectSQL = buildSelectSQL(config);
  const rows = await db.query<Record<string, unknown>>(selectSQL);

  if (rows.length === 0) {
    return { data: "", rowCount: 0, format: "csv" };
  }

  const firstRow = rows[0] as Record<string, unknown>;
  const headers = Object.keys(firstRow);
  const lines: string[] = [headers.map(escapeCSVField).join(",")];

  for (const row of rows) {
    const values = headers.map((h) => escapeCSVField(String(row[h] ?? "")));
    lines.push(values.join(","));
  }

  return { data: lines.join("\n"), rowCount: rows.length, format: "csv" };
}

export async function exportToJSON(
  db: WorkspaceDuckDB,
  config: WorkspaceExportConfig
): Promise<ExportResult> {
  await resolveObjectByName(db, config.objectName);

  const selectSQL = buildSelectSQL(config);
  const rows = await db.query<Record<string, unknown>>(selectSQL);

  return {
    data: JSON.stringify(rows, null, 2),
    rowCount: rows.length,
    format: "json",
  };
}

export async function exportToParquet(
  db: WorkspaceDuckDB,
  config: WorkspaceExportConfig,
  outputPath: string
): Promise<ExportResult> {
  await resolveObjectByName(db, config.objectName);

  const selectSQL = buildSelectSQL(config);
  const safePath = escapeSqlValue(outputPath);

  await db.execute(`COPY (${selectSQL}) TO ${safePath} (FORMAT PARQUET)`);

  const countResult = await db.query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM (${selectSQL})`
  );
  const rowCount = Number(countResult[0]?.cnt ?? 0);

  return { data: outputPath, rowCount, format: "parquet" };
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
