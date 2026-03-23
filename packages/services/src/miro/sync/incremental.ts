import type {
  MiroSyncBatch,
  MiroSyncCursor,
  MiroTransformContext,
} from "@openbeam/types/services/connectors/miro";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listBoardsPaginated } from "../api/boards";
import { listBoardItems } from "../api/items";
import type { MiroClient } from "../client";
import { transformMiroBoard } from "../transformers/board";
import { transformMiroItem } from "../transformers/item";
import { miroFullSync } from "./full";

type SyncOptions = {
  cursor?: MiroSyncCursor;
  batchSize?: number;
  includeBoards?: string[];
  excludeBoards?: string[];
};

export async function* miroIncrementalSync(
  client: MiroClient,
  context: MiroTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<MiroSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* miroFullSync(client, context, options);
    return;
  }

  const includeBoards = options.includeBoards ?? [];
  const excludeBoards = options.excludeBoards ?? [];
  const sinceTime = cursor.lastSyncTime;

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const boards of listBoardsPaginated(client, {
      sort: "last_modified",
    })) {
      for (const board of boards) {
        const boardModified = new Date(board.modifiedAt).getTime();
        if (boardModified <= sinceTime) {
          continue;
        }

        if (includeBoards.length > 0 && !includeBoards.includes(board.id)) {
          skipped += 1;
          continue;
        }
        if (excludeBoards.length > 0 && excludeBoards.includes(board.id)) {
          skipped += 1;
          continue;
        }

        try {
          documents.push(transformMiroBoard(board, context));
          processed += 1;
          latestModified = trackModified(board.modifiedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, boardId: board.id },
            "Error transforming Miro board in incremental sync"
          );
          errors += 1;
        }

        try {
          for await (const items of listBoardItems(client, board.id)) {
            for (const item of items) {
              try {
                documents.push(
                  transformMiroItem(item, board.id, board.name, context)
                );
                processed += 1;
                latestModified = trackModified(item.modifiedAt, latestModified);
              } catch (error) {
                logger.error(
                  { error, itemId: item.id, boardId: board.id },
                  "Error transforming Miro item in incremental sync"
                );
                errors += 1;
              }
            }

            if (documents.length >= batchSize) {
              yield {
                items: documents,
                cursor: {
                  lastSyncTime: latestModified,
                  lastFullSync: cursor.lastFullSync,
                },
                hasMore: true,
                stats: { processed, skipped, errors },
              };
              documents = [];
            }
          }
        } catch (error) {
          logger.error(
            { error, boardId: board.id },
            "Error listing items for Miro board in incremental sync"
          );
          errors += 1;
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Miro incremental sync failed, falling back to full"
    );
    yield* miroFullSync(client, context, options);
  }
}

function trackModified(modifiedAt: string, current: number): number {
  const ts = new Date(modifiedAt).getTime();
  return ts > current ? ts : current;
}
