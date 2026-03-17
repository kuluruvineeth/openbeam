import { type Database, Prisma } from "@openbeam/db";
import type {
  LoadSyncCheckpointInput,
  SaveSyncCheckpointInput,
  SyncCheckpoint,
} from "./types";

interface Dependencies {
  db: Database;
}

export function createSaveSyncCheckpointActivity(deps: Dependencies) {
  return async function saveSyncCheckpoint(
    input: SaveSyncCheckpointInput
  ): Promise<void> {
    const checkpoint: Prisma.InputJsonValue = {
      syncType: input.syncType,
      cursor: JSON.parse(input.cursor),
      processed: input.processed,
      indexed: input.indexed,
      errors: input.errors,
      savedAt: Date.now(),
    };

    await deps.db.syncJob.updateMany({
      where: { connectorId: input.connectorId },
      data: { checkpoint },
    });
  };
}

export function createLoadSyncCheckpointActivity(deps: Dependencies) {
  return async function loadSyncCheckpoint(
    input: LoadSyncCheckpointInput
  ): Promise<SyncCheckpoint | null> {
    const syncJob = await deps.db.syncJob.findFirst({
      where: {
        connectorId: input.connectorId,
        checkpoint: { not: Prisma.DbNull },
      },
      select: { checkpoint: true },
      orderBy: { createdAt: "desc" },
    });

    if (!syncJob?.checkpoint) {
      return null;
    }

    const raw = syncJob.checkpoint as Record<string, unknown>;
    if (!raw.cursor || raw.syncType !== input.syncType) {
      return null;
    }

    return {
      cursor: raw.cursor as Record<string, unknown>,
      processed: (raw.processed as number) ?? 0,
      indexed: (raw.indexed as number) ?? 0,
      errors: (raw.errors as number) ?? 0,
    };
  };
}

export function createClearSyncCheckpointActivity(deps: Dependencies) {
  return async function clearSyncCheckpoint(
    connectorId: string
  ): Promise<void> {
    await deps.db.syncJob.updateMany({
      where: { connectorId },
      data: { checkpoint: Prisma.DbNull },
    });
  };
}
