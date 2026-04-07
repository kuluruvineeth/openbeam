export interface ServicenowIncidentCreateResult {
  sysId: string | undefined;
  number: unknown;
  url: string | undefined;
}

export interface ServicenowIncidentUpdateResult {
  sysId: string | undefined;
  url: string | undefined;
}

export interface ServicenowIncidentCommentResult {
  sysId: string | undefined;
  url: string | undefined;
}

export interface ServicenowActionResults {
  incident_create: ServicenowIncidentCreateResult;
  incident_update: ServicenowIncidentUpdateResult;
  incident_comment: ServicenowIncidentCommentResult;
}
