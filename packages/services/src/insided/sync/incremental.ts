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
import { insidedFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* insidedIncrementalSync(
  client: InsidedClient,
  context: InsidedTransformContext,
  options: InsidedSyncOptions = {}
): AsyncGenerator<InsidedSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncArticles = true,
    syncIdeas = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* insidedFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "InSided incremental sync started"
  );

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated posts", processed);

    for await (const posts of listPosts(client, { updatedSince })) {
      for (const post of posts) {
        try {
          documents.push(await transformPost(post, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, postId: post.id },
            "Error transforming post in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    if (syncArticles) {
      await onStageChange?.("Syncing updated articles", processed);

      for await (const articles of listArticles(client, { updatedSince })) {
        for (const article of articles) {
          try {
            documents.push(await transformArticle(article, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, articleId: article.id },
              "Error transforming article in incremental sync"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: cursor.lastSyncTime,
              lastFullSync: cursor.lastFullSync,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      }
    }

    if (syncIdeas) {
      await onStageChange?.("Syncing updated ideas", processed);

      for await (const ideas of listIdeas(client, { updatedSince })) {
        for (const idea of ideas) {
          try {
            documents.push(await transformIdea(idea, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, ideaId: idea.id },
              "Error transforming idea in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: InsidedSyncCursor = {
      lastSyncTime: Date.now(),
      lastFullSync: cursor.lastFullSync,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "InSided incremental sync failed, falling back to full"
    );
    yield* insidedFullSync(client, context, options);
  }
}
