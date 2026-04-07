export interface SmartsheetSheetListResult {
  sheets: unknown[];
}

export interface SmartsheetSheetCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface SmartsheetRowAddResult {
  id: string | undefined;
}

export interface SmartsheetRowUpdateResult {
  id: string | undefined;
}

export interface SmartsheetActionResults {
  sheet_list: SmartsheetSheetListResult;
  sheet_create: SmartsheetSheetCreateResult;
  row_add: SmartsheetRowAddResult;
  row_update: SmartsheetRowUpdateResult;
}
