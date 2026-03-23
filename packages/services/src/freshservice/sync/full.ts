import type {
  FreshserviceSyncBatch,
  FreshserviceSyncCursor,
  FreshserviceSyncOptions,
  FreshserviceTransformContext,
} from "@openbeam/types/services/connectors/freshservice";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { FreshserviceClient } from "../client";
import type { FreshserviceArticle } from "../transformers/article";
import { transformArticle } from "../transformers/article";
import type { FreshserviceChange } from "../transformers/change";
import { transformChange } from "../transformers/change";
import type { FreshserviceProblem } from "../transformers/problem";
import { transformProblem } from "../transformers/problem";
import type { FreshserviceTicket } from "../transformers/ticket";
import { transformTicket } from "../transformers/ticket";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 300;

interface PaginatedTicketsResponse {
  tickets: FreshserviceTicket[];
}

interface PaginatedArticlesResponse {
  articles: FreshserviceArticle[];
}

interface PaginatedChangesResponse {
  changes: FreshserviceChange[];
}

interface PaginatedProblemsResponse {
  problems: FreshserviceProblem[];
}

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

interface EntitySyncContext {
  client: FreshserviceClient;
  context: FreshserviceTransformContext;
  state: SyncState;
  cursor: FreshserviceSyncCursor;
  batchSize: number;
  onStageChange?: FreshserviceSyncOptions["onStageChange"];
}

function buildSinceDate(lookbackDays?: number): string {
  const days = lookbackDays ?? 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

export async function* fullSync(
  client: FreshserviceClient,
  context: FreshserviceTransformContext,
  options: FreshserviceSyncOptions = {}
): AsyncGenerator<FreshserviceSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncArticles = true,
    syncChanges = false,
    syncProblems = false,
    lookbackDays,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncArticles,
      syncChanges,
      syncProblems,
      lookbackDays,
    },
    "Freshservice full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: FreshserviceSyncCursor = {
    lastSyncTime: Date.now(),
  };

  let latestUpdatedAt: string | undefined;

  await onStageChange?.("Syncing tickets", state.processed);
  const sinceDate = buildSinceDate(lookbackDays);

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const params: Record<string, string> = {
      per_page: String(DEFAULT_PAGE_SIZE),
      page: String(page),
      updated_since: sinceDate,
      order_type: "desc",
      order_by: "updated_at",
    };

    const response = await client.get<PaginatedTicketsResponse>(
      "/tickets",
      params
    );

    if (!response.tickets?.length) {
      break;
    }

    for (const ticket of response.tickets) {
      try {
        await onStageChange?.(
          "Processing tickets",
          state.processed,
          ticket.subject
        );

        if (
          ticket.updated_at &&
          (!latestUpdatedAt || ticket.updated_at > latestUpdatedAt)
        ) {
          latestUpdatedAt = ticket.updated_at;
        }

        state.documents.push(await transformTicket(ticket, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastTicketUpdatedAt = latestUpdatedAt;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, ticketId: ticket.id },
          "Error processing Freshservice ticket"
        );
        state.errors += 1;
      }
    }

    hasMore = response.tickets.length === DEFAULT_PAGE_SIZE;
    page += 1;
  }

  const entityCtx: EntitySyncContext = {
    client,
    context,
    state,
    cursor,
    batchSize,
    onStageChange,
  };

  if (syncArticles) {
    await onStageChange?.("Syncing articles", state.processed);
    yield* syncArticlePages(entityCtx);
  }

  if (syncChanges) {
    await onStageChange?.("Syncing changes", state.processed);
    yield* syncChangePages(entityCtx);
  }

  if (syncProblems) {
    await onStageChange?.("Syncing problems", state.processed);
    yield* syncProblemPages(entityCtx);
  }

  cursor.lastTicketUpdatedAt = latestUpdatedAt;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Freshservice full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}

async function* syncArticlePages(
  ctx: EntitySyncContext
): AsyncGenerator<FreshserviceSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, state, cursor, batchSize, onStageChange } = ctx;
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    let response: PaginatedArticlesResponse;
    try {
      response = await client.get<PaginatedArticlesResponse>(
        "/solutions/articles",
        { per_page: String(DEFAULT_PAGE_SIZE), page: String(page) }
      );
    } catch (error) {
      logger.warn({ error }, "Failed to fetch articles, skipping");
      break;
    }

    if (!response.articles?.length) {
      break;
    }

    for (const article of response.articles) {
      try {
        await onStageChange?.(
          "Processing articles",
          state.processed,
          article.title
        );
        state.documents.push(await transformArticle(article, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, articleId: article.id },
          "Error processing Freshservice article"
        );
        state.errors += 1;
      }
    }

    hasMore = response.articles.length === DEFAULT_PAGE_SIZE;
    page += 1;
  }
}

async function* syncChangePages(
  ctx: EntitySyncContext
): AsyncGenerator<FreshserviceSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, state, cursor, batchSize, onStageChange } = ctx;
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    let response: PaginatedChangesResponse;
    try {
      response = await client.get<PaginatedChangesResponse>("/changes", {
        per_page: String(DEFAULT_PAGE_SIZE),
        page: String(page),
      });
    } catch (error) {
      logger.warn({ error }, "Failed to fetch changes, skipping");
      break;
    }

    if (!response.changes?.length) {
      break;
    }

    for (const change of response.changes) {
      try {
        await onStageChange?.(
          "Processing changes",
          state.processed,
          change.subject
        );
        state.documents.push(await transformChange(change, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, changeId: change.id },
          "Error processing Freshservice change"
        );
        state.errors += 1;
      }
    }

    hasMore = response.changes.length === DEFAULT_PAGE_SIZE;
    page += 1;
  }
}

async function* syncProblemPages(
  ctx: EntitySyncContext
): AsyncGenerator<FreshserviceSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, state, cursor, batchSize, onStageChange } = ctx;
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    let response: PaginatedProblemsResponse;
    try {
      response = await client.get<PaginatedProblemsResponse>("/problems", {
        per_page: String(DEFAULT_PAGE_SIZE),
        page: String(page),
      });
    } catch (error) {
      logger.warn({ error }, "Failed to fetch problems, skipping");
      break;
    }

    if (!response.problems?.length) {
      break;
    }

    for (const problem of response.problems) {
      try {
        await onStageChange?.(
          "Processing problems",
          state.processed,
          problem.subject
        );
        state.documents.push(await transformProblem(problem, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, problemId: problem.id },
          "Error processing Freshservice problem"
        );
        state.errors += 1;
      }
    }

    hasMore = response.problems.length === DEFAULT_PAGE_SIZE;
    page += 1;
  }
}
