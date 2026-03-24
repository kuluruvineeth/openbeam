import type {
  HighspotSyncBatch,
  HighspotSyncCursor,
  HighspotTransformContext,
} from "@openbeam/types/services/connectors/highspot";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllItems } from "../api/items";
import { listAllPitches } from "../api/pitches";
import { listAllSpots } from "../api/spots";
import type { HighspotClient } from "../client";
import { transformHighspotItem } from "../transformers/item";
import { transformHighspotPitch } from "../transformers/pitch";
import { transformHighspotSpot } from "../transformers/spot";

export async function* highspotFullSync(
  client: HighspotClient,
  context: HighspotTransformContext,
  options: {
    batchSize?: number;
    syncPitches?: boolean;
  } = {}
): AsyncGenerator<HighspotSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncPitches = options.syncPitches ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const items of listAllItems(client)) {
    for (const item of items) {
      try {
        documents.push(transformHighspotItem(item, context));
        processed += 1;
        latestModified = trackModified(item.updated_at, latestModified);
      } catch (error) {
        logger.error(
          { error, itemId: item.id },
          "Error transforming Highspot item"
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

  for await (const spots of listAllSpots(client)) {
    for (const spot of spots) {
      try {
        documents.push(transformHighspotSpot(spot, context));
        processed += 1;
        latestModified = trackModified(spot.updated_at, latestModified);
      } catch (error) {
        logger.error(
          { error, spotId: spot.id },
          "Error transforming Highspot spot"
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

  if (syncPitches) {
    for await (const pitches of listAllPitches(client)) {
      for (const pitch of pitches) {
        try {
          documents.push(transformHighspotPitch(pitch, context));
          processed += 1;
          latestModified = trackModified(pitch.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, pitchId: pitch.id },
            "Error transforming Highspot pitch"
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
  }

  const cursor: HighspotSyncCursor = {
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
): HighspotSyncBatch<GenericDocument> {
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

function trackModified(updateTime: string, current: number): number {
  const ts = new Date(updateTime).getTime();
  return ts > current ? ts : current;
}
