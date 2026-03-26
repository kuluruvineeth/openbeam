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

export async function* showpadFullSync(
  client: ShowpadClient,
  context: ShowpadTransformContext,
  options: {
    batchSize?: number;
    syncChannels?: boolean;
    syncExperiences?: boolean;
    syncTags?: boolean;
  } = {}
): AsyncGenerator<ShowpadSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncChannels = options.syncChannels ?? true;
  const syncExperiences = options.syncExperiences ?? true;
  const syncTags = options.syncTags ?? true;
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;

  for await (const page of listAllAssets(client)) {
    for (const asset of page.assets) {
      try {
        documents.push(transformShowpadAsset(asset, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, assetId: asset.id, assetName: asset.name },
          "Error transforming Showpad asset"
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

  if (syncChannels) {
    for await (const page of listAllChannels(client)) {
      for (const channel of page.channels) {
        try {
          documents.push(transformShowpadChannel(channel, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, channelId: channel.id },
            "Error transforming Showpad channel"
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

  if (syncExperiences) {
    for await (const page of listAllExperiences(client)) {
      for (const experience of page.experiences) {
        try {
          documents.push(transformShowpadExperience(experience, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, experienceId: experience.id },
            "Error transforming Showpad experience"
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
      for await (const page of listAllTags(client)) {
        for (const tag of page.tags) {
          try {
            documents.push(transformShowpadTag(tag, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, tagId: tag.id },
              "Error transforming Showpad tag"
            );
            errors += 1;
          }
        }
      }
    } catch (error) {
      logger.error(
        { error, connectorId: client.connectorId },
        "Error fetching Showpad tags"
      );
      errors += 1;
    }
  }

  const cursor: ShowpadSyncCursor = {
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
