import type {
  MondaySyncBatch,
  MondaySyncCursor,
  MondaySyncOptions,
  MondayTransformContext,
  MondayUpdate,
} from "@openbeam/types/services/connectors/monday";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllBoards } from "../api/boards";
import { getBoardItems } from "../api/items";
import { getItemUpdates } from "../api/updates";
import type { MondayClient } from "../client";
import { transformBoard } from "../transformers/board";
import { transformItem } from "../transformers/item";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

function shouldSkipByTime(
  updatedAt: string | null,
  lookbackTime: number | undefined
): boolean {
  if (!(lookbackTime && updatedAt)) {
    return false;
  }
  return new Date(updatedAt).getTime() < lookbackTime;
}

function matchesBoardFilter(
  boardId: string,
  includeBoardIds?: string[],
  excludeBoardIds?: string[]
): boolean {
  if (excludeBoardIds?.length && excludeBoardIds.includes(boardId)) {
    return false;
  }
  if (includeBoardIds?.length) {
    return includeBoardIds.includes(boardId);
  }
  return true;
}

async function collectUpdates(
  client: MondayClient,
  itemId: string,
  syncUpdates: boolean
): Promise<MondayUpdate[]> {
  if (!syncUpdates) {
    return [];
  }
  const updates: MondayUpdate[] = [];
  for await (const update of getItemUpdates(client, itemId)) {
    updates.push(update);
  }
  return updates;
}

export async function* fullSync(
  client: MondayClient,
  context: MondayTransformContext,
  options: MondaySyncOptions = {}
): AsyncGenerator<MondaySyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncUpdates = true,
    lookbackDays,
    boardKindsFilter,
    includeBoardIds,
    excludeBoardIds,
    onStageChange,
  } = options;

  logger.info(
    { syncUpdates, lookbackDays, boardKindsFilter },
    "Monday full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: MondaySyncCursor = {
    lastSyncTime: Date.now(),
    syncedBoardIds: [],
  };

  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  await onStageChange?.("Discovering boards", 0);

  for await (const board of getAllBoards(client, {
    boardKinds: boardKindsFilter,
  })) {
    if (!matchesBoardFilter(board.id, includeBoardIds, excludeBoardIds)) {
      state.skipped += 1;
      continue;
    }

    if (shouldSkipByTime(board.updated_at, lookbackTime)) {
      state.skipped += 1;
      continue;
    }

    cursor.syncedBoardIds?.push(board.id);

    try {
      await onStageChange?.(`Syncing board: ${board.name}`, state.processed);
      state.documents.push(await transformBoard(board, context));
      state.processed += 1;

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    } catch (error) {
      logger.error({ error, boardId: board.id }, "Error transforming board");
      state.errors += 1;
    }

    await onStageChange?.(`Syncing items: ${board.name}`, state.processed);

    try {
      for await (const item of getBoardItems(client, board.id)) {
        if (shouldSkipByTime(item.updated_at, lookbackTime)) {
          state.skipped += 1;
          continue;
        }

        try {
          const updates = await collectUpdates(client, item.id, syncUpdates);
          state.documents.push(await transformItem(item, context, { updates }));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error({ error, itemId: item.id }, "Error transforming item");
          state.errors += 1;
        }
      }
    } catch (error) {
      logger.error({ error, boardId: board.id }, "Error fetching board items");
      state.errors += 1;
    }
  }

  logger.info(
    { ...state, documentsCount: state.documents.length },
    "Monday full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
