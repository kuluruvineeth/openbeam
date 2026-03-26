import type { SmartsheetClient } from "../client";

export interface SmartsheetColumn {
  id: number;
  title: string;
  type: string;
  index: number;
  primary?: boolean;
  hidden?: boolean;
}

export interface SmartsheetCell {
  columnId: number;
  value?: string | number | boolean;
  displayValue?: string;
}

export interface SmartsheetRow {
  id: number;
  rowNumber: number;
  parentId?: number;
  cells: SmartsheetCell[];
  createdAt?: string;
  modifiedAt?: string;
  locked?: boolean;
  expanded?: boolean;
}

export interface SmartsheetSheet {
  id: number;
  name: string;
  accessLevel: string;
  permalink: string;
  createdAt: string;
  modifiedAt: string;
  version?: number;
  totalRowCount?: number;
  owner?: string;
  ownerId?: number;
  columns?: SmartsheetColumn[];
  rows?: SmartsheetRow[];
  workspace?: { id: number; name: string };
}

interface SheetListResponse {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  data: SmartsheetSheet[];
}

export async function* listSheets(
  client: SmartsheetClient,
  options: { modifiedSince?: string; pageSize?: number } = {}
): AsyncGenerator<SmartsheetSheet[], void, undefined> {
  const { modifiedSince, pageSize = 100 } = options;
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
      includeOwnerInfo: "true",
    };
    if (modifiedSince) {
      params.modifiedSince = modifiedSince;
    }

    const response = await client.get<SheetListResponse>("/sheets", params);
    const sheets = response.data ?? [];

    if (sheets.length > 0) {
      yield sheets;
    }

    if (page >= response.totalPages || sheets.length < pageSize) {
      break;
    }

    page += 1;
  }
}

export function getSheet(
  client: SmartsheetClient,
  sheetId: number
): Promise<SmartsheetSheet> {
  return client.get<SmartsheetSheet>(`/sheets/${sheetId}`, {
    include: "ownerInfo",
  });
}

export function getSheetWithRows(
  client: SmartsheetClient,
  sheetId: number
): Promise<SmartsheetSheet> {
  return client.get<SmartsheetSheet>(`/sheets/${sheetId}`, {
    include: "ownerInfo",
    pageSize: "500",
  });
}
