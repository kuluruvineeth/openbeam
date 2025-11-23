export type SyncJobInfo = {
  id: string;
  type: string;
  schedule: string | null;
  nextRunAt: Date | string | null;
  lastRanAt: Date | string | null;
  config: Record<string, unknown>;
  priority: number;
  status: string;
};

export type WebhookStatusInfo = {
  enabled: boolean;
  lastReceivedAt: Date | string | null;
  configured: boolean;
};

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
  syncJobs?: {
    full: SyncJobInfo | null;
    incremental: SyncJobInfo | null;
  };
  webhookStatus?: WebhookStatusInfo;
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
