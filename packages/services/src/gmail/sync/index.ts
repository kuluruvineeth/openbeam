export {
  type DomainSyncCursor,
  type DomainSyncOptions,
  type DomainSyncResult,
  type DomainUserCursor,
  getUsersNeedingSync,
  mergeDomainCursors,
  syncDomainMailboxes,
} from "./domain";

export {
  type FullSyncOptions,
  fullSync,
} from "./full";

export {
  type HistorySyncOptions,
  type HistorySyncResult,
  historySync,
  processHistoryBatch,
} from "./history";
export {
  createInitialCursor,
  gmailIncrementalSync,
  type IncrementalSyncOptions,
  type IncrementalSyncResult,
  mergeCursors,
  shouldRunFullSync,
} from "./incremental";
