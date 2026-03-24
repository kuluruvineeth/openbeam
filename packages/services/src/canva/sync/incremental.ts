import type {
  CanvaSyncBatch,
  CanvaSyncCursor,
  CanvaTransformContext,
} from "@openbeam/types/services/connectors/canva";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllDesigns } from "../api/designs";
import type { CanvaClient } from "../client";
import { transformCanvaDesign } from "../transformers/design";
import { canvaFullSync } from "./full";

type SyncOptions = {
  cursor?: CanvaSyncCursor;
  batchSize?: number;
  syncBrandTemplates?: boolean;
  syncFolders?: boolean;
  syncComments?: boolean;
};

export async function* canvaIncrementalSync(
  client: CanvaClient,
  context: CanvaTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<CanvaSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* canvaFullSync(client, context, options);
    return;
  }

  const sinceTime = cursor.lastSyncTime;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const designs of listAllDesigns(client)) {
      for (const design of designs) {
        const updatedAt = new Date(design.updated_at).getTime();
        if (updatedAt <= sinceTime) {
          continue;
        }

        try {
          documents.push(transformCanvaDesign(design, context));
          processed += 1;
          if (updatedAt > latestModified) {
            latestModified = updatedAt;
          }
        } catch (error) {
          logger.error(
            { error, designId: design.id },
            "Error transforming Canva design in incremental sync"
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
      "Canva incremental sync failed, falling back to full"
    );
    yield* canvaFullSync(client, context, options);
  }
}
