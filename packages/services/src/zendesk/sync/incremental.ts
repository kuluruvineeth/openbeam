import type {
  ZendeskSyncBatch,
  ZendeskSyncCursor,
  ZendeskTransformContext,
} from "@openbeam/types/services/connectors/zendesk";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getArticlesUpdatedAfter, getIncrementalTickets } from "../api";
import { buildUserLookup } from "../api/users";
import type { ZendeskClient } from "../client";
import { transformZendeskArticle } from "../transformers/article";
import { transformZendeskTicket } from "../transformers/ticket";
import { zendeskFullSync } from "./full";

export async function* zendeskIncrementalSync(
  client: ZendeskClient,
  context: ZendeskTransformContext,
  options: {
    cursor?: ZendeskSyncCursor;
    batchSize?: number;
    syncComments?: boolean;
  } = {}
): AsyncGenerator<ZendeskSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100, syncComments = false } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* zendeskFullSync(client, context, { batchSize, syncComments });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestSyncTime = cursor.lastSyncTime;

  try {
    for await (const page of getIncrementalTickets(
      client,
      cursor.lastSyncTime
    )) {
      const userIds = collectUserIds(page.tickets);
      const userLookup = await buildUserLookup(client, userIds);

      for (const ticket of page.tickets) {
        try {
          documents.push(transformZendeskTicket(ticket, context, userLookup));
          processed += 1;

          const ticketTs = new Date(ticket.updated_at).getTime();
          if (ticketTs > latestSyncTime) {
            latestSyncTime = ticketTs;
          }
        } catch (error) {
          logger.error(
            { error, ticketId: ticket.id },
            "Error transforming Zendesk ticket"
          );
          errors += 1;
        }
      }

      if (page.endTime > latestSyncTime) {
        latestSyncTime = page.endTime;
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: {
            lastSyncTime: latestSyncTime,
            ticketCursor: page.cursor,
            lastFullSync: cursor.lastFullSync,
          },
          hasMore: true,
          stats: { processed, skipped: 0, errors },
        };
        documents = [];
      }
    }

    try {
      const updatedAfter = new Date(cursor.lastSyncTime).toISOString();
      for await (const articles of getArticlesUpdatedAfter(
        client,
        updatedAfter
      )) {
        const userIds = articles.map((a) => a.author_id);
        const userLookup = await buildUserLookup(client, userIds);

        for (const article of articles) {
          try {
            documents.push(
              transformZendeskArticle(article, context, userLookup)
            );
            processed += 1;

            const articleTs = new Date(article.updated_at).getTime();
            if (articleTs > latestSyncTime) {
              latestSyncTime = articleTs;
            }
          } catch (error) {
            logger.error(
              { error, articleId: article.id },
              "Error transforming Zendesk article"
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
            stats: { processed, skipped: 0, errors },
          };
          documents = [];
        }
      }
    } catch (error) {
      logger.warn(
        { error },
        "Help Center incremental sync failed — org may not have Guide enabled"
      );
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestSyncTime,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Zendesk incremental sync failed, falling back to full"
    );
    yield* zendeskFullSync(client, context, { batchSize, syncComments });
  }
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
