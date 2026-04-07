export interface OpsgenieAlertCreateResult {
  id: string | undefined;
}

export interface OpsgenieAlertAcknowledgeResult {
  acknowledged: true;
}

export interface OpsgenieAlertCloseResult {
  closed: true;
}

export interface OpsgenieAlertNoteAddResult {
  added: true;
}

export interface OpsgenieIncidentCreateResult {
  id: string | undefined;
}

export interface OpsgenieIncidentResolveResult {
  resolved: true;
}

export interface OpsgenieActionResults {
  alert_create: OpsgenieAlertCreateResult;
  alert_acknowledge: OpsgenieAlertAcknowledgeResult;
  alert_close: OpsgenieAlertCloseResult;
  alert_note_add: OpsgenieAlertNoteAddResult;
  incident_create: OpsgenieIncidentCreateResult;
  incident_resolve: OpsgenieIncidentResolveResult;
}
