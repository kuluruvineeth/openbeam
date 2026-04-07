export interface PagerdutyServiceListResult {
  services: unknown[];
}

export interface PagerdutyIncidentCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface PagerdutyIncidentStatusUpdateResult {
  updated: true;
}

export interface PagerdutyIncidentNoteAddResult {
  id: string | undefined;
}

export interface PagerdutyActionResults {
  service_list: PagerdutyServiceListResult;
  incident_create: PagerdutyIncidentCreateResult;
  incident_status_update: PagerdutyIncidentStatusUpdateResult;
  incident_note_add: PagerdutyIncidentNoteAddResult;
}
