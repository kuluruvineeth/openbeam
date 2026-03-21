import type {
  ZendeskSyncBatch,
  ZendeskSyncCursor,
  ZendeskTransformContext,
} from "@openbeam/types/services/connectors/zendesk";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllArticles, getAllTickets, getTicketComments } from "../api";
import { buildUserLookup } from "../api/users";
import type { ZendeskClient } from "../client";
import { transformZendeskArticle } from "../transformers/article";
import { transformZendeskComment } from "../transformers/comment";
import { transformZendeskTicket } from "../transformers/ticket";

export async function* zendeskFullSync(
  client: ZendeskClient,
  context: ZendeskTransformContext,
  options: {
    batchSize?: number;
    syncComments?: boolean;
  } = {}
): AsyncGenerator<ZendeskSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncComments = options.syncComments ?? false;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestUpdatedAt = 0;

  for await (const tickets of getAllTickets(client)) {
    const userIds = collectUserIds(tickets);
    const userLookup = await buildUserLookup(client, userIds);

    for (const ticket of tickets) {
      try {
        documents.push(transformZendeskTicket(ticket, context, userLookup));
        processed += 1;
        latestUpdatedAt = trackTimestamp(ticket.updated_at, latestUpdatedAt);

        if (syncComments) {
          for await (const comments of getTicketComments(client, ticket.id)) {
            for (const comment of comments) {
              documents.push(
                transformZendeskComment(comment, ticket.id, context, userLookup)
              );
              processed += 1;
            }
          }
        }
      } catch (error) {
        logger.error(
          { error, ticketId: ticket.id },
          "Error transforming Zendesk ticket"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield makeBatch({
        items: documents,
        stats: { processed, skipped: 0, errors },
        hasMore: true,
        latestUpdatedAt,
      });
      documents = [];
    }
  }

  try {
    for await (const articles of getAllArticles(client)) {
      const userIds = articles.map((a) => a.author_id);
      const userLookup = await buildUserLookup(client, userIds);

      for (const article of articles) {
        try {
          documents.push(transformZendeskArticle(article, context, userLookup));
          processed += 1;
          latestUpdatedAt = trackTimestamp(article.updated_at, latestUpdatedAt);
        } catch (error) {
          logger.error(
            { error, articleId: article.id },
            "Error transforming Zendesk article"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield makeBatch({
          items: documents,
          stats: { processed, skipped: 0, errors },
          hasMore: true,
          latestUpdatedAt,
        });
        documents = [];
      }
    }
  } catch (error) {
    logger.warn(
      { error },
      "Help Center articles query failed — org may not have Guide enabled"
    );
  }

  const cursor: ZendeskSyncCursor = {
    lastSyncTime: latestUpdatedAt || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped: 0, errors },
  };
}

function collectUserIds(
  tickets: Array<{
    assignee_id: number | null;
    requester_id: number | null;
  }>
): number[] {
  const ids: number[] = [];
  for (const t of tickets) {
    if (t.assignee_id) {
      ids.push(t.assignee_id);
    }
    if (t.requester_id) {
      ids.push(t.requester_id);
    }
  }
  return ids;
}

function makeBatch(params: {
  items: GenericDocument[];
  stats: { processed: number; skipped: number; errors: number };
  hasMore: boolean;
  latestUpdatedAt: number;
}): ZendeskSyncBatch<GenericDocument> {
  return {
    items: params.items,
    cursor: {
      lastSyncTime: params.latestUpdatedAt || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore: params.hasMore,
    stats: params.stats,
  };
}

function trackTimestamp(dateStr: string, current: number): number {
  const ts = new Date(dateStr).getTime();
  return ts > current ? ts : current;
}
