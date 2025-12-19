export type SyncHistoryStatus = "RUNNING" | "COMPLETED" | "FAILED";

export type SyncType = "FULL" | "INCREMENTAL" | "PERMISSIONS";

export interface ServiceCreateSyncHistoryInput {
  connectorId: string;
  type: SyncType;
}

export interface CreateSyncHistoryResult {
  syncHistoryId: string;
  syncJobId: string;
}

export interface UpdateSyncCompletionInput {
  connectorId: string;
  syncHistoryId: string;
  nextCursor?: string;
  documentCount: number;
  batchCount: number;
  startTime: number;
  filesQueued?: number;
  mediaQueued?: number;
}

export interface HandleSyncErrorInput {
  connectorId: string;
  syncHistoryId: string;
  error: unknown;
}

export interface GetSyncCursorResult {
  cursor: string | undefined;
  lastSyncedAt: Date | null;
}

export interface SyncSummary {
  totalDocuments: number;
  batches: number;
  documentsFetched: number;
  filesQueued?: number;
  mediaQueued?: number;
}
