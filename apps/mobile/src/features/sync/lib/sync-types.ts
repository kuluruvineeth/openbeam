export type { SyncSummary } from "@openplane/types/sync";

import type { SyncSummary } from "@openplane/types/sync";

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

export type ProcessingStatus = {
  filesProcessing: number;
  filesIndexed: number;
  mediaProcessing: number;
  mediaIndexed: number;
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
  processing?: ProcessingStatus;
  latestSync: {
    status: string;
    dataAdded: number;
    dataUpdated: number;
    dataDeleted: number;
    documentsAdded?: number;
    documentsUpdated?: number;
    documentsRemoved?: number;
    filesDiscovered?: number;
    mediaDiscovered?: number;
    summary?: unknown;
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
  documentsAdded?: number;
  documentsUpdated?: number;
  documentsRemoved?: number;
  filesDiscovered?: number;
  mediaDiscovered?: number;
  errorMessage: string | null;
  syncJob: {
    type: string;
  } | null;
  summary: unknown;
};

export function isSyncing(syncStatus: SyncStatusType | undefined): boolean {
  return (
    syncStatus?.connector?.status === "SYNCING" ||
    syncStatus?.latestSync?.status === "RUNNING"
  );
}

export function isPaused(syncStatus: SyncStatusType | undefined): boolean {
  return syncStatus?.connector?.status === "INACTIVE";
}

export type PartialSyncSummary = Partial<SyncSummary>;

export function parseSyncSummary(value: unknown): PartialSyncSummary {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  const obj = value as Record<string, unknown>;
  return {
    filesQueued:
      typeof obj.filesQueued === "number" ? obj.filesQueued : undefined,
    mediaQueued:
      typeof obj.mediaQueued === "number" ? obj.mediaQueued : undefined,
  };
}

export function formatDuration(ms: number | null): string {
  if (!ms) {
    return "\u2014";
  }
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
