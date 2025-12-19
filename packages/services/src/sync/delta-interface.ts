import type { GenericDocument } from "@openplane/vespa";

export interface DeltaCursor {
  lastSyncTimestamp?: number;
  resourceCursors?: Record<string, string>;
  checkpoint?: string;
  version: number;
}

export interface DeltaBatch<T = GenericDocument> {
  items: T[];
  cursor: Partial<DeltaCursor>;
  hasMore: boolean;
  stats: DeltaBatchStats;
}

export interface DeltaBatchStats {
  processed: number;
  skipped: number;
  errors: number;
  added?: number;
  updated?: number;
  deleted?: number;
}

export interface DeltaSyncOptions {
  cursor?: DeltaCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  resourceTypes?: string[];
  since?: Date;
}

export interface DeltaSyncResult {
  cursor: DeltaCursor;
  stats: DeltaSyncStats;
}

export interface DeltaSyncStats {
  totalProcessed: number;
  totalAdded: number;
  totalUpdated: number;
  totalDeleted: number;
  totalSkipped: number;
  totalErrors: number;
  durationMs: number;
}

export interface DeltaChange {
  type: "create" | "update" | "delete";
  resourceType: string;
  resourceId: string;
  document?: GenericDocument;
  timestamp: number;
}

export interface DeltaConnector<TContext = unknown> {
  supportsDeltas(): boolean;

  getChanges(
    context: TContext,
    options: DeltaSyncOptions
  ): AsyncGenerator<DeltaBatch, void, undefined>;

  getChangesSince(
    context: TContext,
    since: Date,
    resourceTypes?: string[]
  ): AsyncGenerator<DeltaChange, void, undefined>;

  createInitialCursor(): DeltaCursor;

  mergeCursors(
    existing: DeltaCursor,
    update: Partial<DeltaCursor>
  ): DeltaCursor;

  needsFullSync(cursor: DeltaCursor | undefined, maxAge?: number): boolean;
}

export function createInitialDeltaCursor(): DeltaCursor {
  return {
    lastSyncTimestamp: undefined,
    resourceCursors: {},
    checkpoint: undefined,
    version: 1,
  };
}

export function mergeDeltaCursors(
  existing: DeltaCursor,
  update: Partial<DeltaCursor>
): DeltaCursor {
  return {
    ...existing,
    ...update,
    resourceCursors: {
      ...existing.resourceCursors,
      ...update.resourceCursors,
    },
    version: existing.version,
  };
}

export function needsFullDeltaSync(
  cursor: DeltaCursor | undefined,
  maxAgeMs = 24 * 60 * 60 * 1000
): boolean {
  if (!cursor) {
    return true;
  }

  if (!cursor.lastSyncTimestamp) {
    return true;
  }

  return Date.now() - cursor.lastSyncTimestamp > maxAgeMs;
}

export function createEmptyStats(): DeltaSyncStats {
  return {
    totalProcessed: 0,
    totalAdded: 0,
    totalUpdated: 0,
    totalDeleted: 0,
    totalSkipped: 0,
    totalErrors: 0,
    durationMs: 0,
  };
}

export function aggregateBatchStats(
  accumulated: DeltaSyncStats,
  batch: DeltaBatchStats
): DeltaSyncStats {
  return {
    ...accumulated,
    totalProcessed: accumulated.totalProcessed + batch.processed,
    totalAdded: accumulated.totalAdded + (batch.added ?? 0),
    totalUpdated: accumulated.totalUpdated + (batch.updated ?? 0),
    totalDeleted: accumulated.totalDeleted + (batch.deleted ?? 0),
    totalSkipped: accumulated.totalSkipped + batch.skipped,
    totalErrors: accumulated.totalErrors + batch.errors,
  };
}
