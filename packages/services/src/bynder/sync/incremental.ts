import type {
  BynderSyncBatch,
  BynderSyncCursor,
  BynderTransformContext,
} from "@openbeam/types/services/connectors/bynder";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllAssets } from "../api/assets";
import { listAllCollections } from "../api/collections";
import { listAllTags } from "../api/tags";
import type { BynderClient } from "../client";
import { transformBynderAsset } from "../transformers/asset";
import { transformBynderCollection } from "../transformers/collection";
import { transformBynderTag } from "../transformers/tag";
import { bynderFullSync } from "./full";

export async function* bynderIncrementalSync(
  client: BynderClient,
  context: BynderTransformContext,
  options: {
    cursor?: BynderSyncCursor;
    batchSize?: number;
    syncCollections?: boolean;
    syncTags?: boolean;
  } = {}
): AsyncGenerator<BynderSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = 100,
    syncCollections = true,
    syncTags = true,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* bynderFullSync(client, context, {
      batchSize,
      syncCollections,
      syncTags,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  const sinceDate = new Date(cursor.lastSyncTime);
  const dateFilter = sinceDate.toISOString().split("T")[0] ?? "";

  for await (const page of listAllAssets(client, {
    dateModified: dateFilter,
  })) {
    for (const asset of page.assets) {
      const assetModified = new Date(asset.dateModified).getTime();
      if (assetModified <= cursor.lastSyncTime) {
        continue;
      }

      try {
        documents.push(transformBynderAsset(asset, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, assetId: asset.id },
          "Error transforming Bynder asset during incremental sync"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield {
        items: documents,
        cursor: {
          lastFullSync: cursor.lastFullSync,
          lastSyncTime: Date.now(),
        },
        hasMore: true,
        stats: { processed, skipped, errors },
      };
      documents = [];
    }
  }

  if (syncCollections) {
    for await (const page of listAllCollections(client)) {
      for (const collection of page.collections) {
        const collectionModified = new Date(collection.dateModified).getTime();
        if (collectionModified <= cursor.lastSyncTime) {
          continue;
        }

        try {
          documents.push(transformBynderCollection(collection, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, collectionId: collection.id },
            "Error transforming Bynder collection during incremental sync"
          );
          errors += 1;
        }
      }
    }
  }

  if (syncTags) {
    try {
      const { tags } = await listAllTags(client);
      for (const tag of tags) {
        try {
          documents.push(transformBynderTag(tag, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, tagId: tag.id },
            "Error transforming Bynder tag during incremental sync"
          );
          errors += 1;
        }
      }
    } catch (error) {
      logger.error(
        { error, connectorId: client.connectorId },
        "Error fetching Bynder tags during incremental sync"
      );
      errors += 1;
    }
  }

  const newCursor: BynderSyncCursor = {
    lastFullSync: cursor.lastFullSync,
    lastSyncTime: Date.now(),
  };

  yield {
    items: documents,
    cursor: newCursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
