export interface MarketoLeadUpsertResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface MarketoActionResults {
  lead_upsert: MarketoLeadUpsertResult;
}
