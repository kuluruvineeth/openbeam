export interface SmartThingsClientConfig {
  connectorId: string;
  accessToken: string;
  timeout?: number;
}

export interface SmartThingsSyncCursor {
  lastSyncTime?: number;
  page?: number;
}

export interface SmartThingsTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
}

export interface SmartThingsSyncBatch<T> {
  items: T[];
  cursor: SmartThingsSyncCursor;
  stage: string;
  hasMore: boolean;
}
