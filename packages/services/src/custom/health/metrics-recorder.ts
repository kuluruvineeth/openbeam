import {
  completeSyncRun,
  createSyncRun,
  type Database,
  failSyncRun,
  upsertHourlyMetrics,
} from "@openbeam/db";
import { createServiceLogger } from "../../lib/logger";
import { invalidateHealthCache } from "./health-scorer";

const log = createServiceLogger({ service: "custom-metrics-recorder" });

export interface SyncRunHandle {
  id: string;
  definitionId: string;
  connectorId: string;
  startedAt: number;
}

function getHourBoundary(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start, end };
}

export async function startSyncRun(
  db: Database,
  definitionId: string,
  connectorId: string,
  syncType: string
): Promise<SyncRunHandle> {
  const run = await createSyncRun(db, { definitionId, syncType });

  log.info({ syncRunId: run.id, definitionId, syncType }, "Sync run started");

  return {
    id: run.id,
    definitionId,
    connectorId,
    startedAt: Date.now(),
  };
}

export async function recordSyncSuccess(
  db: Database,
  handle: SyncRunHandle,
  results: {
    documentsProcessed: number;
    documentsFailed: number;
    documentsDeleted: number;
  }
): Promise<void> {
  const durationMs = Date.now() - handle.startedAt;

  await completeSyncRun(db, handle.id, {
    documentsProcessed: results.documentsProcessed,
    documentsFailed: results.documentsFailed,
    documentsDeleted: results.documentsDeleted,
  });

  const { start, end } = getHourBoundary(new Date());

  await upsertHourlyMetrics(db, {
    definitionId: handle.definitionId,
    periodStart: start,
    periodEnd: end,
    success: true,
    documentsProcessed: results.documentsProcessed,
    errorCount: results.documentsFailed,
    durationMs,
  });

  await invalidateHealthCache(handle.connectorId);

  log.info(
    {
      syncRunId: handle.id,
      definitionId: handle.definitionId,
      durationMs,
      ...results,
    },
    "Sync run completed"
  );
}

export async function recordSyncFailure(
  db: Database,
  handle: SyncRunHandle,
  errorMessage: string
): Promise<void> {
  const durationMs = Date.now() - handle.startedAt;

  await failSyncRun(db, handle.id, errorMessage);

  const { start, end } = getHourBoundary(new Date());

  await upsertHourlyMetrics(db, {
    definitionId: handle.definitionId,
    periodStart: start,
    periodEnd: end,
    success: false,
    documentsProcessed: 0,
    errorCount: 1,
    durationMs,
  });

  await invalidateHealthCache(handle.connectorId);

  log.error(
    {
      syncRunId: handle.id,
      definitionId: handle.definitionId,
      durationMs,
      error: errorMessage,
    },
    "Sync run failed"
  );
}
