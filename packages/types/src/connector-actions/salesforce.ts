export interface SalesforceRecordCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface SalesforceRecordUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface SalesforceActionResults {
  record_create: SalesforceRecordCreateResult;
  record_update: SalesforceRecordUpdateResult;
}
