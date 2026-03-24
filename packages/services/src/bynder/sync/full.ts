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

export async function* bynderFullSync(
  client: BynderClient,
  context: BynderTransformContext,
  options: {
    batchSize?: number;
    syncCollections?: boolean;
    syncTags?: boolean;
  } = {}
): AsyncGenerator<BynderSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncCollections = options.syncCollections ?? true;
  const syncTags = options.syncTags ?? true;
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;

  for await (const page of listAllAssets(client)) {
    for (const asset of page.assets) {
      try {
        documents.push(transformBynderAsset(asset, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, assetId: asset.id, assetName: asset.name },
          "Error transforming Bynder asset"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield {
        items: documents,
        cursor: { lastFullSync: Date.now() },
        hasMore: true,
        stats: { processed, skipped, errors },
      };
      documents = [];
    }
  }

  if (syncCollections) {
    for await (const page of listAllCollections(client)) {
      for (const collection of page.collections) {
        try {
          documents.push(transformBynderCollection(collection, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, collectionId: collection.id },
            "Error transforming Bynder collection"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { lastFullSync: Date.now() },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
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
            "Error transforming Bynder tag"
          );
          errors += 1;
        }
      }
    } catch (error) {
      logger.error(
        { error, connectorId: client.connectorId },
        "Error fetching Bynder tags"
      );
      errors += 1;
    }
  }

  const cursor: BynderSyncCursor = {
    lastFullSync: Date.now(),
    lastSyncTime: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
