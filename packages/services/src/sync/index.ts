export {
  DEFAULT_SYNC_RESOURCE,
  getSyncCursorForConnector,
  updateSyncCursor,
} from "./cursor";
export type {
  DeltaBatch,
  DeltaBatchStats,
  DeltaChange,
  DeltaConnector,
  DeltaCursor,
  DeltaSyncOptions,
  DeltaSyncResult,
  DeltaSyncStats,
} from "./delta-interface";
export {
  aggregateBatchStats,
  createEmptyStats,
  createInitialDeltaCursor,
  mergeDeltaCursors,
  needsFullDeltaSync,
} from "./delta-interface";
export {
  completeSyncHistoryRecord,
  createSyncHistoryForRepeatableJob,
  markSyncHistoryFailed,
  prepareSyncHistory,
} from "./history";
export { handleSyncError, updateSyncCompletion } from "./status";

export type {
  CreateSyncHistoryResult,
  GetSyncCursorResult,
  HandleSyncErrorInput,
  ServiceCreateSyncHistoryInput,
  SyncHistoryStatus,
  SyncSummary,
  SyncType,
  UpdateSyncCompletionInput,
} from "./types";
