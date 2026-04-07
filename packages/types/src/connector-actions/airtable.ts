export interface AirtableBaseListResult {
  bases: unknown[];
}

export interface AirtableTableListResult {
  tables: unknown[];
}

export interface AirtableRecordCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface AirtableRecordUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface AirtableRecordDeleteResult {
  recordId: string | undefined;
}

export interface AirtableActionResults {
  base_list: AirtableBaseListResult;
  table_list: AirtableTableListResult;
  record_create: AirtableRecordCreateResult;
  record_update: AirtableRecordUpdateResult;
  record_delete: AirtableRecordDeleteResult;
}
