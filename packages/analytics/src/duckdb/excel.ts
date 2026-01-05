import type { DuckDBClient } from "./client";
import {
  DuckDBApiError,
  DuckDBErrorCodes,
  type SpreadsheetColumn,
} from "./types";

export interface SheetInfo {
  name: string;
  index: number;
  rowCount: number;
  columns: SpreadsheetColumn[];
}

export interface ExcelWorkbook {
  fileName: string;
  sheets: SheetInfo[];
  activeSheet: string;
}

export interface LoadSheetOptions {
  sheet?: string;
  headerRow?: number;
  skipRows?: number;
  maxRows?: number;
}

export interface MultiSheetResult {
  workbook: ExcelWorkbook;
  viewNames: Map<string, string>;
}

const EXCEL_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export function isExcelFile(mimeType: string): boolean {
  return EXCEL_MIME_TYPES.has(mimeType);
}

export async function loadExcelWorkbook(
  client: DuckDBClient,
  documentId: string,
  fileBuffer: Buffer,
  options?: LoadSheetOptions
): Promise<MultiSheetResult> {
  const viewNames = new Map<string, string>();

  const { viewName } = await client.loadSpreadsheet(
    documentId,
    fileBuffer,
    "xlsx",
    options?.sheet
  );

  const activeSheet = options?.sheet ?? "Sheet1";
  viewNames.set(activeSheet, viewName);

  const columns = await client.getSchema(viewName);
  const sampleData = await client.getSampleData(viewName, 1);

  const workbook: ExcelWorkbook = {
    fileName: documentId,
    sheets: [
      {
        name: activeSheet,
        index: 0,
        rowCount: 0,
        columns,
      },
    ],
    activeSheet,
  };

  const firstSheet = workbook.sheets[0];
  if (sampleData.length > 0 && firstSheet) {
    firstSheet.rowCount = 1;
  }

  return { workbook, viewNames };
}

export async function loadAllSheets(
  client: DuckDBClient,
  documentId: string,
  fileBuffer: Buffer,
  sheetNames: string[]
): Promise<MultiSheetResult> {
  const viewNames = new Map<string, string>();
  const sheets: SheetInfo[] = [];

  for (let i = 0; i < sheetNames.length; i++) {
    const sheetName = sheetNames[i];
    if (!sheetName) {
      continue;
    }
    const sheetDocId = `${documentId}_sheet_${i}`;

    try {
      const { viewName } = await client.loadSpreadsheet(
        sheetDocId,
        fileBuffer,
        "xlsx",
        sheetName
      );

      viewNames.set(sheetName, viewName);

      const columns = await client.getSchema(viewName);

      sheets.push({
        name: sheetName,
        index: i,
        rowCount: 0,
        columns,
      });
    } catch (error) {
      if (
        error instanceof DuckDBApiError &&
        error.code === DuckDBErrorCodes.INTERNAL_ERROR
      ) {
        continue;
      }
      throw error;
    }
  }

  const firstLoadedSheet = sheets[0];
  if (!firstLoadedSheet) {
    throw new DuckDBApiError({
      message: "No valid sheets found in Excel file",
      code: DuckDBErrorCodes.INTERNAL_ERROR,
      retryable: false,
    });
  }

  const workbook: ExcelWorkbook = {
    fileName: documentId,
    sheets,
    activeSheet: firstLoadedSheet.name,
  };

  return { workbook, viewNames };
}

export interface SwitchSheetParams {
  client: DuckDBClient;
  documentId: string;
  fileBuffer: Buffer;
  targetSheet: string;
  currentViewNames: Map<string, string>;
}

export async function switchSheet(
  params: SwitchSheetParams
): Promise<{ viewName: string; columns: SpreadsheetColumn[] }> {
  const { client, documentId, fileBuffer, targetSheet, currentViewNames } =
    params;
  const existingView = currentViewNames.get(targetSheet);
  if (existingView) {
    const columns = await client.getSchema(existingView);
    return { viewName: existingView, columns };
  }

  const sheetDocId = `${documentId}_sheet_${targetSheet}`;
  const { viewName } = await client.loadSpreadsheet(
    sheetDocId,
    fileBuffer,
    "xlsx",
    targetSheet
  );

  currentViewNames.set(targetSheet, viewName);
  const columns = await client.getSchema(viewName);

  return { viewName, columns };
}

export function getSheetViewName(
  viewNames: Map<string, string>,
  sheetName: string
): string {
  const viewName = viewNames.get(sheetName);
  if (!viewName) {
    throw new DuckDBApiError({
      message: `Sheet "${sheetName}" not loaded`,
      code: DuckDBErrorCodes.INTERNAL_ERROR,
      retryable: false,
    });
  }
  return viewName;
}

export async function unloadAllSheets(
  client: DuckDBClient,
  viewNames: Map<string, string>
): Promise<void> {
  for (const viewName of viewNames.values()) {
    await client.unloadSpreadsheet(viewName);
  }
  viewNames.clear();
}
