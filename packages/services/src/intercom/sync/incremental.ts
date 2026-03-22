import type {
  IntercomSyncBatch,
  IntercomTransformContext,
} from "@openbeam/types/services/connectors/intercom";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import {
  getAllArticles,
  getConversation,
  searchConversationsUpdatedAfter,
} from "../api";
import type { IntercomClient } from "../client";
import { transformIntercomArticle } from "../transformers/article";
import { transformIntercomConversation } from "../transformers/conversation";
import type { IntercomFullSyncOptions } from "./full";
import { intercomFullSync } from "./full";

export type IntercomIncrementalSyncOptions = IntercomFullSyncOptions & {
  cursor?: {
    lastSyncTime?: number;
    lastFullSync?: number;
  };
};

export async function* intercomIncrementalSync(
  client: IntercomClient,
  context: IntercomTransformContext,
  options: IntercomIncrementalSyncOptions = {}
): AsyncGenerator<IntercomSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = 50,
    syncConversations = true,
    syncArticles = true,
    syncCollections = true,
    syncContacts = false,
    stateFilter,
    tagsFilter,
    lookbackDays,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* intercomFullSync(client, context, {
      batchSize,
      syncConversations,
      syncArticles,
      syncCollections,
      syncContacts,
      stateFilter,
      tagsFilter,
      lookbackDays,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestSyncTime = cursor.lastSyncTime;

  try {
    if (syncConversations) {
      const updatedAfterUnix = Math.floor(cursor.lastSyncTime / 1000);

      for await (const conversations of searchConversationsUpdatedAfter(
        client,
        updatedAfterUnix
      )) {
        for (const conversation of conversations) {
          if (stateFilter && conversation.state !== stateFilter) {
            skipped += 1;
            continue;
          }
          if (
            tagsFilter &&
            tagsFilter.length > 0 &&
            !conversation.tags.tags.some((t) => tagsFilter.includes(t.name))
          ) {
            skipped += 1;
            continue;
          }

          try {
            const detailed = await getConversation(client, conversation.id);
            documents.push(transformIntercomConversation(detailed, context));
            processed += 1;

            const conversationTs = detailed.updated_at * 1000;
            if (conversationTs > latestSyncTime) {
              latestSyncTime = conversationTs;
            }
          } catch (error) {
            logger.error(
              { error, conversationId: conversation.id },
              "Error transforming Intercom conversation"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestSyncTime,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    if (syncArticles) {
      try {
        for await (const articles of getAllArticles(client)) {
          for (const article of articles) {
            const articleTs = article.updated_at * 1000;
            if (articleTs <= cursor.lastSyncTime) {
              continue;
            }

            try {
              documents.push(transformIntercomArticle(article, context));
              processed += 1;

              if (articleTs > latestSyncTime) {
                latestSyncTime = articleTs;
              }
            } catch (error) {
              logger.error(
                { error, articleId: article.id },
                "Error transforming Intercom article"
              );
              errors += 1;
            }
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                lastSyncTime: latestSyncTime,
                lastFullSync: cursor.lastFullSync,
              },
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        }
      } catch (error) {
        logger.warn({ error }, "Intercom articles incremental fetch failed");
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestSyncTime,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Intercom incremental sync failed, falling back to full"
    );
    yield* intercomFullSync(client, context, {
      batchSize,
      syncConversations,
      syncArticles,
      syncCollections,
      syncContacts,
      stateFilter,
      tagsFilter,
      lookbackDays,
    });
  }
}
