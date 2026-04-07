export interface HubspotRecordCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface HubspotRecordUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface HubspotActionResults {
  record_create: HubspotRecordCreateResult;
  record_update: HubspotRecordUpdateResult;
}
