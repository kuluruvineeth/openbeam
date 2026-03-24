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
import { highspotFullSync } from "./full";

type SyncOptions = {
  cursor?: HighspotSyncCursor;
  batchSize?: number;
  syncPitches?: boolean;
};

export async function* highspotIncrementalSync(
  client: HighspotClient,
  context: HighspotTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<HighspotSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* highspotFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const items of listAllItems(client, {
      updated_after: sinceDate,
    })) {
      for (const item of items) {
        try {
          documents.push(transformHighspotItem(item, context));
          processed += 1;
          const ts = new Date(item.updated_at).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, itemId: item.id },
            "Error transforming Highspot item in incremental sync"
          );
          errors += 1;
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
    }

    for await (const spots of listAllSpots(client, {
      updated_after: sinceDate,
    })) {
      for (const spot of spots) {
        try {
          documents.push(transformHighspotSpot(spot, context));
          processed += 1;
          const ts = new Date(spot.updated_at).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, spotId: spot.id },
            "Error transforming Highspot spot in incremental sync"
          );
          errors += 1;
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
    }

    if (options.syncPitches !== false) {
      for await (const pitches of listAllPitches(client, {
        updated_after: sinceDate,
      })) {
        for (const pitch of pitches) {
          try {
            documents.push(transformHighspotPitch(pitch, context));
            processed += 1;
            const ts = new Date(pitch.updated_at).getTime();
            if (ts > latestModified) {
              latestModified = ts;
            }
          } catch (error) {
            logger.error(
              { error, pitchId: pitch.id },
              "Error transforming Highspot pitch in incremental sync"
            );
            errors += 1;
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
      "Highspot incremental sync failed, falling back to full"
    );
    yield* highspotFullSync(client, context, options);
  }
}
