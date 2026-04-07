export interface PipedrivePersonListResult {
  persons: unknown[];
}

export interface PipedriveOrgListResult {
  organizations: unknown[];
}

export interface PipedriveDealCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface PipedriveDealUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface PipedrivePersonCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface PipedriveNoteCreateResult {
  recordId: string | undefined;
}

export interface PipedriveActivityCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface PipedriveActionResults {
  person_list: PipedrivePersonListResult;
  org_list: PipedriveOrgListResult;
  deal_create: PipedriveDealCreateResult;
  deal_update: PipedriveDealUpdateResult;
  person_create: PipedrivePersonCreateResult;
  note_create: PipedriveNoteCreateResult;
  activity_create: PipedriveActivityCreateResult;
}
