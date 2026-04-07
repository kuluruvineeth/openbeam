export interface CodaDocListResult {
  docs: unknown[];
}

export interface CodaTableListResult {
  tables: unknown[];
}

export interface CodaDocCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface CodaRowCreateResult {
  recordId: string | undefined;
}

export interface CodaRowUpdateResult {
  recordId: string | undefined;
}

export interface CodaRowDeleteResult {
  deleted: true;
}

export interface CodaActionResults {
  doc_list: CodaDocListResult;
  table_list: CodaTableListResult;
  doc_create: CodaDocCreateResult;
  row_create: CodaRowCreateResult;
  row_update: CodaRowUpdateResult;
  row_delete: CodaRowDeleteResult;
}
