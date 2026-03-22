import type {
  IntercomSyncBatch,
  IntercomSyncCursor,
  IntercomTransformContext,
} from "@openbeam/types/services/connectors/intercom";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import {
  getAllArticles,
  getAllCollections,
  getAllContacts,
  getAllConversations,
  getConversation,
} from "../api";
import type { IntercomClient } from "../client";
import { transformIntercomArticle } from "../transformers/article";
import { transformIntercomCollection } from "../transformers/collection";
import { transformIntercomContact } from "../transformers/contact";
import { transformIntercomConversation } from "../transformers/conversation";

export type IntercomFullSyncOptions = {
  batchSize?: number;
  syncConversations?: boolean;
  syncArticles?: boolean;
  syncCollections?: boolean;
  syncContacts?: boolean;
  lookbackDays?: number;
  stateFilter?: string;
  tagsFilter?: string[];
};

export async function* intercomFullSync(
  client: IntercomClient,
  context: IntercomTransformContext,
  options: IntercomFullSyncOptions = {}
): AsyncGenerator<IntercomSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncConversations = options.syncConversations ?? true;
  const syncArticles = options.syncArticles ?? true;
  const syncCollections = options.syncCollections ?? true;
  const syncContacts = options.syncContacts ?? false;
  const lookbackCutoff = options.lookbackDays
    ? Date.now() - options.lookbackDays * 86_400_000
    : undefined;

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestUpdatedAt = 0;

  if (syncConversations) {
    for await (const conversations of getAllConversations(client)) {
      for (const conversation of conversations) {
        if (shouldSkipConversation(conversation, options, lookbackCutoff)) {
          skipped += 1;
          continue;
        }

        try {
          const detailed = await getConversation(client, conversation.id);
          documents.push(transformIntercomConversation(detailed, context));
          processed += 1;
          latestUpdatedAt = trackTimestamp(
            detailed.updated_at * 1000,
            latestUpdatedAt
          );
        } catch (error) {
          logger.error(
            { error, conversationId: conversation.id },
            "Error transforming Intercom conversation"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestUpdatedAt
        );
        documents = [];
      }
    }
  }

  if (syncArticles) {
    try {
      for await (const articles of getAllArticles(client)) {
        for (const article of articles) {
          try {
            documents.push(transformIntercomArticle(article, context));
            processed += 1;
            latestUpdatedAt = trackTimestamp(
              article.updated_at * 1000,
              latestUpdatedAt
            );
          } catch (error) {
            logger.error(
              { error, articleId: article.id },
              "Error transforming Intercom article"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield makeBatch(
            documents,
            { processed, skipped, errors },
            true,
            latestUpdatedAt
          );
          documents = [];
        }
      }
    } catch (error) {
      logger.warn(
        { error },
        "Intercom articles fetch failed — Help Center may not be enabled"
      );
    }
  }

  if (syncCollections) {
    try {
      for await (const collections of getAllCollections(client)) {
        for (const collection of collections) {
          try {
            documents.push(transformIntercomCollection(collection, context));
            processed += 1;
            latestUpdatedAt = trackTimestamp(
              collection.updated_at * 1000,
              latestUpdatedAt
            );
          } catch (error) {
            logger.error(
              { error, collectionId: collection.id },
              "Error transforming Intercom collection"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield makeBatch(
            documents,
            { processed, skipped, errors },
            true,
            latestUpdatedAt
          );
          documents = [];
        }
      }
    } catch (error) {
      logger.warn(
        { error },
        "Intercom collections fetch failed — Help Center may not be enabled"
      );
    }
  }

  if (syncContacts) {
    for await (const contacts of getAllContacts(client)) {
      for (const contact of contacts) {
        try {
          documents.push(transformIntercomContact(contact, context));
          processed += 1;
          latestUpdatedAt = trackTimestamp(
            contact.updated_at * 1000,
            latestUpdatedAt
          );
        } catch (error) {
          logger.error(
            { error, contactId: contact.id },
            "Error transforming Intercom contact"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestUpdatedAt
        );
        documents = [];
      }
    }
  }

  const cursor: IntercomSyncCursor = {
    lastSyncTime: latestUpdatedAt || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function shouldSkipConversation(
  conversation: {
    state: string;
    created_at: number;
    tags: { tags: Array<{ name: string }> };
  },
  options: IntercomFullSyncOptions,
  lookbackCutoff?: number
): boolean {
  if (options.stateFilter && conversation.state !== options.stateFilter) {
    return true;
  }

  if (
    options.tagsFilter &&
    options.tagsFilter.length > 0 &&
    !conversation.tags.tags.some((tag) =>
      options.tagsFilter?.includes(tag.name)
    )
  ) {
    return true;
  }

  if (lookbackCutoff && conversation.created_at * 1000 < lookbackCutoff) {
    return true;
  }

  return false;
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestUpdatedAt: number
): IntercomSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestUpdatedAt || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackTimestamp(ts: number, current: number): number {
  return ts > current ? ts : current;
}
