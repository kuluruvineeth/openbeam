export type SyncStatusType = {
  connector: {
    status: string;
    lastSyncedAt: Date | string | null;
    lastError: string | null;
  };
  stats: {
    totalIndexed: number;
  };
  latestSync: {
    status: string;
    dataAdded: number;
    dataUpdated: number;
  } | null;
};

export type SyncHistoryEntry = {
  id: string;
  status: string;
  startedAt: Date | string;
  durationMs: number | null;
  dataAdded: number;
  dataUpdated: number;
  dataDeleted: number;
  errorMessage: string | null;
  syncJob: {
    type: string;
  } | null;
};

export function isSyncing(syncStatus: SyncStatusType | undefined): boolean {
  return (
    syncStatus?.connector?.status === "SYNCING" ||
    syncStatus?.latestSync?.status === "SYNCING"
  );
}

export function isPaused(syncStatus: SyncStatusType | undefined): boolean {
  return syncStatus?.connector?.status === "INACTIVE";
}
