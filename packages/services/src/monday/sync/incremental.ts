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

export interface IncrementalSyncOptions extends MondaySyncOptions {
  lastSyncTime: number;
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

export async function* incrementalSync(
  client: MondayClient,
  context: MondayTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<MondaySyncBatch<GenericDocument>, void, undefined> {
  const {
    lastSyncTime,
    batchSize = DEFAULT_BATCH_SIZE,
    syncUpdates = true,
    boardKindsFilter,
    includeBoardIds,
    excludeBoardIds,
    onStageChange,
  } = options;

  logger.info({ lastSyncTime }, "Monday incremental sync started");

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const cursor: MondaySyncCursor = {
    lastSyncTime: Date.now(),
    syncedBoardIds: [],
  };

  await onStageChange?.("Checking for updated boards", 0);

  for await (const board of getAllBoards(client, {
    boardKinds: boardKindsFilter,
  })) {
    if (includeBoardIds?.length && !includeBoardIds.includes(board.id)) {
      continue;
    }
    if (excludeBoardIds?.includes(board.id)) {
      continue;
    }

    const boardUpdatedAt = board.updated_at
      ? new Date(board.updated_at).getTime()
      : 0;

    if (boardUpdatedAt < lastSyncTime) {
      continue;
    }

    cursor.syncedBoardIds?.push(board.id);

    try {
      await onStageChange?.(
        `Processing updated board: ${board.name}`,
        processed
      );
      documents.push(await transformBoard(board, context));
      processed += 1;

      if (documents.length >= batchSize) {
        yield createSyncBatch(documents, cursor, true, {
          processed,
          skipped: 0,
          errors,
        });
        documents = [];
      }
    } catch (error) {
      logger.error({ error, boardId: board.id }, "Error transforming board");
      errors += 1;
    }

    try {
      for await (const item of getBoardItems(client, board.id)) {
        const itemUpdatedAt = item.updated_at
          ? new Date(item.updated_at).getTime()
          : 0;

        if (itemUpdatedAt < lastSyncTime) {
          continue;
        }

        try {
          await onStageChange?.(
            `Processing updated items: ${board.name}`,
            processed,
            item.name
          );

          const updates = await collectUpdates(client, item.id, syncUpdates);
          documents.push(await transformItem(item, context, { updates }));
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(documents, cursor, true, {
              processed,
              skipped: 0,
              errors,
            });
            documents = [];
          }
        } catch (error) {
          logger.error({ error, itemId: item.id }, "Error transforming item");
          errors += 1;
        }
      }
    } catch (error) {
      logger.error({ error, boardId: board.id }, "Error fetching board items");
      errors += 1;
    }
  }

  logger.info(
    { processed, errors, documentsCount: documents.length },
    "Monday incremental sync complete"
  );

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  }
}
