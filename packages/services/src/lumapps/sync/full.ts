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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* lumappsFullSync(
  client: LumAppsClient,
  context: LumAppsTransformContext,
  options: LumAppsSyncOptions = {}
): AsyncGenerator<LumAppsSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncCommunities = true,
    syncPosts = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncCommunities,
      syncPosts,
    },
    "LumApps full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: LumAppsSyncCursor = {
    lastSyncTime: Date.now(),
  };

  let latestContentUpdated: string | undefined;
  let latestPostUpdated: string | undefined;

  await onStageChange?.("Syncing contents", state.processed);

  for await (const contents of listContents(client)) {
    for (const content of contents) {
      try {
        await onStageChange?.(
          "Processing contents",
          state.processed,
          content.title
        );

        if (!latestContentUpdated || content.updatedAt > latestContentUpdated) {
          latestContentUpdated = content.updatedAt;
        }

        state.documents.push(await transformContent(content, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastContentUpdatedAt = latestContentUpdated;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, contentId: content.id },
          "Error processing LumApps content"
        );
        state.errors += 1;
      }
    }
  }

  await onStageChange?.("Syncing spaces", state.processed);

  for await (const spaces of listSpaces(client)) {
    for (const space of spaces) {
      try {
        await onStageChange?.("Processing spaces", state.processed, space.name);

        state.documents.push(await transformSpace(space, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, spaceId: space.id },
          "Error processing LumApps space"
        );
        state.errors += 1;
      }
    }
  }

  if (syncCommunities) {
    await onStageChange?.("Syncing communities", state.processed);

    for await (const communities of listCommunities(client)) {
      for (const community of communities) {
        try {
          await onStageChange?.(
            "Processing communities",
            state.processed,
            community.name
          );

          state.documents.push(await transformCommunity(community, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, communityId: community.id },
            "Error processing LumApps community"
          );
          state.errors += 1;
        }
      }
    }
  }

  if (syncPosts) {
    await onStageChange?.("Syncing posts", state.processed);

    for await (const posts of listPosts(client)) {
      for (const post of posts) {
        try {
          await onStageChange?.("Processing posts", state.processed);

          if (!latestPostUpdated || post.updatedAt > latestPostUpdated) {
            latestPostUpdated = post.updatedAt;
          }

          state.documents.push(await transformPost(post, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            cursor.lastPostUpdatedAt = latestPostUpdated;
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, postId: post.id },
            "Error processing LumApps post"
          );
          state.errors += 1;
        }
      }
    }
  }

  cursor.lastContentUpdatedAt = latestContentUpdated;
  cursor.lastPostUpdatedAt = latestPostUpdated;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "LumApps full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
