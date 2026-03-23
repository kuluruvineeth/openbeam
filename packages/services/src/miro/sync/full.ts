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

export async function* miroFullSync(
  client: MiroClient,
  context: MiroTransformContext,
  options: {
    batchSize?: number;
    includeBoards?: string[];
    excludeBoards?: string[];
  } = {}
): AsyncGenerator<MiroSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const includeBoards = options.includeBoards ?? [];
  const excludeBoards = options.excludeBoards ?? [];

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const boards of listBoardsPaginated(client)) {
    for (const board of boards) {
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
          "Error transforming Miro board"
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
                "Error transforming Miro item"
              );
              errors += 1;
            }
          }

          if (documents.length >= batchSize) {
            yield makeBatch(
              documents,
              { processed, skipped, errors },
              true,
              latestModified
            );
            documents = [];
          }
        }
      } catch (error) {
        logger.error(
          { error, boardId: board.id },
          "Error listing items for Miro board"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  const cursor: MiroSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): MiroSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(modifiedAt: string, current: number): number {
  const ts = new Date(modifiedAt).getTime();
  return ts > current ? ts : current;
}
