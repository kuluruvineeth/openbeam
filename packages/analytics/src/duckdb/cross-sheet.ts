import type { DuckDBClient } from "./client";
import { DuckDBApiError, DuckDBErrorCodes, type QueryResult } from "./types";
import { assertValidSQL } from "./validation";

export interface CrossSheetContext {
  documentId: string;
  viewNames: Map<string, string>;
  primarySheet: string;
}

export interface JoinConfig {
  leftSheet: string;
  rightSheet: string;
  leftColumn: string;
  rightColumn: string;
  joinType: "INNER" | "LEFT" | "RIGHT" | "FULL";
}

export interface CrossSheetQuery {
  sql: string;
  sheets: string[];
  joinConfigs?: JoinConfig[];
}

const SHEET_REFERENCE_PATTERN = /\[([^\]]+)\]/g;

export function extractSheetReferences(sql: string): string[] {
  const sheets = new Set<string>();
  let match: RegExpExecArray | null;

  SHEET_REFERENCE_PATTERN.lastIndex = 0;
  match = SHEET_REFERENCE_PATTERN.exec(sql);
  while (match !== null) {
    const sheetName = match[1];
    if (sheetName) {
      sheets.add(sheetName);
    }
    match = SHEET_REFERENCE_PATTERN.exec(sql);
  }

  return Array.from(sheets);
}

export function rewriteSheetReferences(
  sql: string,
  viewNames: Map<string, string>
): string {
  return sql.replace(SHEET_REFERENCE_PATTERN, (_, sheetName: string) => {
    const viewName = viewNames.get(sheetName);
    if (!viewName) {
      throw new DuckDBApiError({
        message: `Sheet "${sheetName}" not found in loaded sheets`,
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: false,
      });
    }
    return `"${viewName}"`;
  });
}

export function buildJoinQuery(
  config: JoinConfig,
  viewNames: Map<string, string>,
  selectColumns?: string[]
): string {
  const leftView = viewNames.get(config.leftSheet);
  const rightView = viewNames.get(config.rightSheet);

  if (!(leftView && rightView)) {
    throw new DuckDBApiError({
      message: `One or more sheets not loaded: ${config.leftSheet}, ${config.rightSheet}`,
      code: DuckDBErrorCodes.INTERNAL_ERROR,
      retryable: false,
    });
  }

  const columns = selectColumns?.length ? selectColumns.join(", ") : "l.*, r.*";

  return `
    SELECT ${columns}
    FROM "${leftView}" l
    ${config.joinType} JOIN "${rightView}" r
    ON l."${config.leftColumn}" = r."${config.rightColumn}"
  `.trim();
}

export function buildUnionQuery(
  sheets: string[],
  viewNames: Map<string, string>,
  unionType: "UNION" | "UNION ALL" = "UNION ALL"
): string {
  const queries = sheets.map((sheet) => {
    const viewName = viewNames.get(sheet);
    if (!viewName) {
      throw new DuckDBApiError({
        message: `Sheet "${sheet}" not loaded`,
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: false,
      });
    }
    return `SELECT *, '${sheet}' as _source_sheet FROM "${viewName}"`;
  });

  return queries.join(`\n${unionType}\n`);
}

export function executeCrossSheetQuery(
  client: DuckDBClient,
  context: CrossSheetContext,
  query: CrossSheetQuery,
  options?: { timeoutMs?: number; maxRows?: number }
): Promise<QueryResult> {
  const requiredSheets = extractSheetReferences(query.sql);
  for (const sheet of requiredSheets) {
    if (!context.viewNames.has(sheet)) {
      throw new DuckDBApiError({
        message: `Sheet "${sheet}" referenced but not loaded`,
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: false,
      });
    }
  }

  const rewrittenSql = rewriteSheetReferences(query.sql, context.viewNames);

  const allowedTables = Array.from(context.viewNames.values());
  allowedTables.push("data");
  assertValidSQL(rewrittenSql, allowedTables);

  const primaryView = context.viewNames.get(context.primarySheet);
  if (!primaryView) {
    throw new DuckDBApiError({
      message: `Primary sheet "${context.primarySheet}" not loaded`,
      code: DuckDBErrorCodes.INTERNAL_ERROR,
      retryable: false,
    });
  }

  return client.query(context.documentId, rewrittenSql, primaryView, {
    timeoutMs: options?.timeoutMs,
    maxResultRows: options?.maxRows,
  });
}

export function validateJoinColumns(
  leftColumns: string[],
  rightColumns: string[],
  config: JoinConfig
): { valid: boolean; error?: string } {
  if (!leftColumns.includes(config.leftColumn)) {
    return {
      valid: false,
      error: `Column "${config.leftColumn}" not found in sheet "${config.leftSheet}"`,
    };
  }

  if (!rightColumns.includes(config.rightColumn)) {
    return {
      valid: false,
      error: `Column "${config.rightColumn}" not found in sheet "${config.rightSheet}"`,
    };
  }

  return { valid: true };
}

function calculateJoinConfidence(left: string, right: string): number {
  if (left === right) {
    return 1.0;
  }

  const bothHaveId = left.includes("id") && right.includes("id");
  if (bothHaveId) {
    const leftBase = left.replace("id", "").replace("_", "");
    const rightBase = right.replace("id", "").replace("_", "");
    if (left.includes(rightBase) || right.includes(leftBase)) {
      return 0.7;
    }
  }

  const leftEndsWithId = left.endsWith("_id") && right === "id";
  const rightEndsWithId = right.endsWith("_id") && left === "id";
  if (leftEndsWithId || rightEndsWithId) {
    return 0.5;
  }

  return 0;
}

export function suggestJoinColumns(
  leftColumns: string[],
  rightColumns: string[]
): Array<{ left: string; right: string; confidence: number }> {
  const suggestions: Array<{
    left: string;
    right: string;
    confidence: number;
  }> = [];

  for (const leftCol of leftColumns) {
    const leftLower = leftCol.toLowerCase();
    for (const rightCol of rightColumns) {
      const confidence = calculateJoinConfidence(
        leftLower,
        rightCol.toLowerCase()
      );
      if (confidence > 0) {
        suggestions.push({ left: leftCol, right: rightCol, confidence });
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
