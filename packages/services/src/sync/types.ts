export type {
  SyncHistoryStatus,
  SyncSummary,
  SyncType,
} from "@openplane/types/sync";

import type { SyncType } from "@openplane/types/sync";

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
