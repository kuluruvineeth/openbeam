import type {
  InsidedSyncBatch,
  InsidedSyncCursor,
  InsidedSyncOptions,
  InsidedTransformContext,
} from "@openbeam/types/services/connectors/insided";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listArticles } from "../api/articles";
import { listIdeas } from "../api/ideas";
import { listPosts } from "../api/posts";
import type { InsidedClient } from "../client";
import { transformArticle } from "../transformers/article";
import { transformIdea } from "../transformers/idea";
import { transformPost } from "../transformers/post";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* insidedFullSync(
  client: InsidedClient,
  context: InsidedTransformContext,
  options: InsidedSyncOptions = {}
): AsyncGenerator<InsidedSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncArticles = true,
    syncIdeas = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncArticles,
      syncIdeas,
    },
    "InSided full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: InsidedSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing posts", state.processed);

  for await (const posts of listPosts(client)) {
    for (const post of posts) {
      try {
        state.documents.push(await transformPost(post, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, postId: post.id },
          "Error transforming InSided post"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncArticles) {
    await onStageChange?.("Syncing articles", state.processed);

    for await (const articles of listArticles(client)) {
      for (const article of articles) {
        try {
          state.documents.push(await transformArticle(article, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, articleId: article.id },
            "Error transforming InSided article"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  if (syncIdeas) {
    await onStageChange?.("Syncing ideas", state.processed);

    for await (const ideas of listIdeas(client)) {
      for (const idea of ideas) {
        try {
          state.documents.push(await transformIdea(idea, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, ideaId: idea.id },
            "Error transforming InSided idea"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "InSided full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
