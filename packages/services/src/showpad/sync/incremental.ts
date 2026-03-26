import type {
  ShowpadSyncBatch,
  ShowpadSyncCursor,
  ShowpadTransformContext,
} from "@openbeam/types/services/connectors/showpad";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllAssets } from "../api/assets";
import { listAllChannels } from "../api/channels";
import { listAllExperiences } from "../api/experiences";
import { listAllTags } from "../api/tags";
import type { ShowpadClient } from "../client";
import { transformShowpadAsset } from "../transformers/asset";
import { transformShowpadChannel } from "../transformers/channel";
import { transformShowpadExperience } from "../transformers/experience";
import { transformShowpadTag } from "../transformers/tag";
import { showpadFullSync } from "./full";

export async function* showpadIncrementalSync(
  client: ShowpadClient,
  context: ShowpadTransformContext,
  options: {
    cursor?: ShowpadSyncCursor;
    batchSize?: number;
    syncChannels?: boolean;
    syncExperiences?: boolean;
    syncTags?: boolean;
  } = {}
): AsyncGenerator<ShowpadSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = 100,
    syncChannels = true,
    syncExperiences = true,
    syncTags = true,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* showpadFullSync(client, context, {
      batchSize,
      syncChannels,
      syncExperiences,
      syncTags,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  const sinceDate = new Date(cursor.lastSyncTime).toISOString();

  for await (const page of listAllAssets(client, {
    updatedSince: sinceDate,
  })) {
    for (const asset of page.assets) {
      try {
        documents.push(transformShowpadAsset(asset, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, assetId: asset.id },
          "Error transforming Showpad asset during incremental sync"
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

  if (syncChannels) {
    for await (const page of listAllChannels(client)) {
      for (const channel of page.channels) {
        const channelUpdated = new Date(channel.updatedAt).getTime();
        if (channelUpdated <= cursor.lastSyncTime) {
          continue;
        }

        try {
          documents.push(transformShowpadChannel(channel, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, channelId: channel.id },
            "Error transforming Showpad channel during incremental sync"
          );
          errors += 1;
        }
      }
    }
  }

  if (syncExperiences) {
    for await (const page of listAllExperiences(client)) {
      for (const experience of page.experiences) {
        const expUpdated = new Date(experience.updatedAt).getTime();
        if (expUpdated <= cursor.lastSyncTime) {
          continue;
        }

        try {
          documents.push(transformShowpadExperience(experience, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, experienceId: experience.id },
            "Error transforming Showpad experience during incremental sync"
          );
          errors += 1;
        }
      }
    }
  }

  if (syncTags) {
    try {
      for await (const page of listAllTags(client)) {
        for (const tag of page.tags) {
          try {
            documents.push(transformShowpadTag(tag, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, tagId: tag.id },
              "Error transforming Showpad tag during incremental sync"
            );
            errors += 1;
          }
        }
      }
    } catch (error) {
      logger.error(
        { error, connectorId: client.connectorId },
        "Error fetching Showpad tags during incremental sync"
      );
      errors += 1;
    }
  }

  const newCursor: ShowpadSyncCursor = {
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
