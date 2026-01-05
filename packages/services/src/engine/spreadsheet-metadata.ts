import type { JsonObject } from "@openplane/vespa";

export interface SpreadsheetColumnMetadata {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "unknown";
  nullable: boolean;
  sampleValues?: unknown[];
}

export interface SpreadsheetMetadata {
  isSpreadsheet: true;
  fileName: string;
  sheets: string[];
  activeSheet: string;
  columns: SpreadsheetColumnMetadata[];
  rowCount: number;
  columnCount: number;
  hasHeaders: boolean;
  storageKey?: string;
  fileSize?: number;
}

export interface SpreadsheetExtractionResult {
  metadata: SpreadsheetMetadata;
  contentSummary: string;
  searchableColumnNames: string[];
}

const SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  "application/csv",
]);

const SPREADSHEET_EXTENSIONS = new Set(["xls", "xlsx", "ods", "csv", "tsv"]);

const DOT_PREFIX_PATTERN = /^\./;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const US_DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{2,4}/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

export function isSpreadsheetFile(
  mimeType?: string | null,
  extension?: string | null
): boolean {
  if (mimeType && SPREADSHEET_MIME_TYPES.has(mimeType)) {
    return true;
  }
  if (extension) {
    const ext = extension.toLowerCase().replace(DOT_PREFIX_PATTERN, "");
    return SPREADSHEET_EXTENSIONS.has(ext);
  }
  return false;
}

export function getSpreadsheetType(
  mimeType?: string | null,
  extension?: string | null
): "xlsx" | "xls" | "csv" | "ods" | null {
  const ext = extension?.toLowerCase().replace(DOT_PREFIX_PATTERN, "");

  if (ext === "xlsx" || mimeType?.includes("spreadsheetml")) {
    return "xlsx";
  }
  if (ext === "xls" || mimeType === "application/vnd.ms-excel") {
    return "xls";
  }
  if (ext === "csv" || mimeType?.includes("csv")) {
    return "csv";
  }
  if (ext === "ods" || mimeType?.includes("opendocument.spreadsheet")) {
    return "ods";
  }
  return null;
}

function isNonEmptyValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

function classifyValue(
  value: unknown
): "number" | "date" | "boolean" | "string" | null {
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (value instanceof Date) {
    return "date";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (ISO_DATE_PATTERN.test(trimmed) || US_DATE_PATTERN.test(trimmed)) {
      return "date";
    }
    if (NUMBER_PATTERN.test(trimmed)) {
      return "number";
    }
    if (trimmed.toLowerCase() === "true" || trimmed.toLowerCase() === "false") {
      return "boolean";
    }
    return "string";
  }
  return null;
}

function inferColumnType(values: unknown[]): SpreadsheetColumnMetadata["type"] {
  const nonNullValues = values.filter(isNonEmptyValue);

  if (nonNullValues.length === 0) {
    return "unknown";
  }

  const typeCounts = { number: 0, date: 0, boolean: 0, string: 0 };

  for (const value of nonNullValues) {
    const classification = classifyValue(value);
    if (classification) {
      typeCounts[classification] += 1;
    }
  }

  if (typeCounts.string > 0) {
    return "string";
  }
  if (
    typeCounts.date > 0 &&
    typeCounts.number === 0 &&
    typeCounts.boolean === 0
  ) {
    return "date";
  }
  if (
    typeCounts.number > 0 &&
    typeCounts.date === 0 &&
    typeCounts.boolean === 0
  ) {
    return "number";
  }
  if (
    typeCounts.boolean > 0 &&
    typeCounts.date === 0 &&
    typeCounts.number === 0
  ) {
    return "boolean";
  }

  return "string";
}

export function extractSpreadsheetMetadata(
  fileName: string,
  rows: Record<string, unknown>[],
  options?: {
    sheets?: string[];
    activeSheet?: string;
    fileSize?: number;
    storageKey?: string;
  }
): SpreadsheetExtractionResult {
  const columnNames = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columnNames.add(key);
    }
  }

  const columns: SpreadsheetColumnMetadata[] = [];
  const orderedColumnNames = Array.from(columnNames);

  for (const name of orderedColumnNames) {
    const values = rows.map((row) => row[name]);
    const nonNullCount = values.filter(isNonEmptyValue).length;

    columns.push({
      name,
      type: inferColumnType(values),
      nullable: nonNullCount < rows.length,
      sampleValues: values.slice(0, 3),
    });
  }

  const metadata: SpreadsheetMetadata = {
    isSpreadsheet: true,
    fileName,
    sheets: options?.sheets ?? ["Sheet1"],
    activeSheet: options?.activeSheet ?? "Sheet1",
    columns,
    rowCount: rows.length,
    columnCount: columns.length,
    hasHeaders: true,
    storageKey: options?.storageKey,
    fileSize: options?.fileSize,
  };

  const contentSummary = buildContentSummary(metadata);
  const searchableColumnNames = columns.map((c) => c.name);

  return {
    metadata,
    contentSummary,
    searchableColumnNames,
  };
}

function buildContentSummary(metadata: SpreadsheetMetadata): string {
  const lines: string[] = [];

  lines.push(`Spreadsheet: ${metadata.fileName}`);
  lines.push(`Rows: ${metadata.rowCount}, Columns: ${metadata.columnCount}`);

  if (metadata.sheets.length > 1) {
    lines.push(`Sheets: ${metadata.sheets.join(", ")}`);
  }

  lines.push("");
  lines.push("Columns:");

  for (const col of metadata.columns) {
    lines.push(`- ${col.name} (${col.type})`);
  }

  return lines.join("\n");
}

export function spreadsheetMetadataToJson(
  metadata: SpreadsheetMetadata
): JsonObject {
  return {
    isSpreadsheet: metadata.isSpreadsheet,
    fileName: metadata.fileName,
    sheets: metadata.sheets,
    activeSheet: metadata.activeSheet,
    columns: metadata.columns.map((col) => ({
      name: col.name,
      type: col.type,
      nullable: col.nullable,
    })),
    rowCount: metadata.rowCount,
    columnCount: metadata.columnCount,
    hasHeaders: metadata.hasHeaders,
    ...(metadata.storageKey && { storageKey: metadata.storageKey }),
    ...(metadata.fileSize && { fileSize: metadata.fileSize }),
  };
}

export function parseSpreadsheetMetadataFromJson(
  json: JsonObject
): SpreadsheetMetadata | null {
  if (!json || json.isSpreadsheet !== true) {
    return null;
  }

  const columns = Array.isArray(json.columns)
    ? (json.columns as JsonObject[]).map(
        (col): SpreadsheetColumnMetadata => ({
          name: String(col.name ?? ""),
          type: (col.type as SpreadsheetColumnMetadata["type"]) ?? "unknown",
          nullable: Boolean(col.nullable),
        })
      )
    : [];

  return {
    isSpreadsheet: true,
    fileName: String(json.fileName ?? ""),
    sheets: Array.isArray(json.sheets) ? (json.sheets as string[]) : ["Sheet1"],
    activeSheet: String(json.activeSheet ?? "Sheet1"),
    columns,
    rowCount: Number(json.rowCount ?? 0),
    columnCount: Number(json.columnCount ?? 0),
    hasHeaders: Boolean(json.hasHeaders ?? true),
    ...(json.storageKey && { storageKey: String(json.storageKey) }),
    ...(json.fileSize && { fileSize: Number(json.fileSize) }),
  };
}

export function getSpreadsheetQueryContext(metadata: SpreadsheetMetadata): {
  availableColumns: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
} {
  const columnTypes: Record<string, string> = {};
  for (const col of metadata.columns) {
    columnTypes[col.name] = col.type;
  }

  return {
    availableColumns: metadata.columns.map((c) => c.name),
    columnTypes,
    rowCount: metadata.rowCount,
  };
}
