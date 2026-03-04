export interface AzureIotClientConfig {
  connectorId: string;
  connectionString: string;
  timeout?: number;
}

export interface AzureIotSyncCursor {
  lastSyncTime?: number;
  continuationToken?: string;
}

export interface AzureIotTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  hubName: string;
}

export interface AzureIotSyncBatch<T> {
  items: T[];
  cursor: AzureIotSyncCursor;
  stage: string;
  hasMore: boolean;
}
