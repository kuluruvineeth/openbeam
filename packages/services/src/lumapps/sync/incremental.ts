import type {
  LumAppsSyncBatch,
  LumAppsSyncCursor,
  LumAppsSyncOptions,
  LumAppsTransformContext,
} from "@openbeam/types/services/connectors/lumapps";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listCommunities } from "../api/communities";
import { listContents } from "../api/contents";
import { listPosts } from "../api/posts";
import { listSpaces } from "../api/spaces";
import type { LumAppsClient } from "../client";
import { transformCommunity } from "../transformers/community";
import { transformContent } from "../transformers/content";
import { transformPost } from "../transformers/post";
import { transformSpace } from "../transformers/space";
import { lumappsFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* lumappsIncrementalSync(
  client: LumAppsClient,
  context: LumAppsTransformContext,
  options: LumAppsSyncOptions = {}
): AsyncGenerator<LumAppsSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncCommunities = true,
    syncPosts = true,
    onStageChange,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* lumappsFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "LumApps incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestContentUpdated = cursor.lastContentUpdatedAt;
  let latestPostUpdated = cursor.lastPostUpdatedAt;

  const sinceTimestamp = cursor.lastSyncTime;

  try {
    await onStageChange?.("Syncing updated contents", processed);

    for await (const contents of listContents(client)) {
      for (const content of contents) {
        const updatedMs = new Date(content.updatedAt).getTime();
        if (updatedMs <= sinceTimestamp) {
          continue;
        }

        try {
          if (
            !latestContentUpdated ||
            content.updatedAt > latestContentUpdated
          ) {
            latestContentUpdated = content.updatedAt;
          }

          documents.push(await transformContent(content, context));
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(
              documents,
              {
                lastSyncTime: sinceTimestamp,
                lastContentUpdatedAt: latestContentUpdated,
                lastPostUpdatedAt: latestPostUpdated,
              },
              true,
              { processed, skipped: 0, errors }
            );
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, contentId: content.id },
            "Error processing content in incremental sync"
          );
          errors += 1;
        }
      }
    }

    await onStageChange?.("Syncing spaces", processed);

    for await (const spaces of listSpaces(client)) {
      for (const space of spaces) {
        const updatedMs = new Date(space.updatedAt).getTime();
        if (updatedMs <= sinceTimestamp) {
          continue;
        }

        try {
          documents.push(await transformSpace(space, context));
          processed += 1;
        } catch (error) {
          logger.error({ error, spaceId: space.id }, "Error processing space");
          errors += 1;
        }
      }
    }

    if (syncCommunities) {
      await onStageChange?.("Syncing communities", processed);

      for await (const communities of listCommunities(client)) {
        for (const community of communities) {
          const updatedMs = new Date(community.updatedAt).getTime();
          if (updatedMs <= sinceTimestamp) {
            continue;
          }

          try {
            documents.push(await transformCommunity(community, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, communityId: community.id },
              "Error processing community"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncPosts) {
      await onStageChange?.("Syncing updated posts", processed);

      for await (const posts of listPosts(client)) {
        for (const post of posts) {
          const updatedMs = new Date(post.updatedAt).getTime();
          if (updatedMs <= sinceTimestamp) {
            continue;
          }

          try {
            if (!latestPostUpdated || post.updatedAt > latestPostUpdated) {
              latestPostUpdated = post.updatedAt;
            }

            documents.push(await transformPost(post, context));
            processed += 1;

            if (documents.length >= batchSize) {
              yield createSyncBatch(
                documents,
                {
                  lastSyncTime: sinceTimestamp,
                  lastContentUpdatedAt: latestContentUpdated,
                  lastPostUpdatedAt: latestPostUpdated,
                },
                true,
                { processed, skipped: 0, errors }
              );
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, postId: post.id },
              "Error processing post in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: LumAppsSyncCursor = {
      lastSyncTime: Date.now(),
      lastContentUpdatedAt: latestContentUpdated,
      lastPostUpdatedAt: latestPostUpdated,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "LumApps incremental sync failed, falling back to full"
    );
    yield* lumappsFullSync(client, context, options);
  }
}
