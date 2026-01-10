export interface SyncSummary {
  totalDocuments: number;
  batches: number;
  documentsFetched: number;
  filesQueued?: number;
  mediaQueued?: number;
}
