import type {
  NotionDatabase,
  NotionPage,
  NotionSearchResponse,
} from "@openbeam/types/services/connectors/notion";
import { logger } from "../../lib/logger";
import type { NotionClient } from "../client";

export interface SearchOptions {
  query?: string;
  filter?: {
    property: "object";
    value: "page" | "database";
  };
  sort?: {
    direction: "ascending" | "descending";
    timestamp: "last_edited_time";
  };
  startCursor?: string;
  pageSize?: number;
}

export async function search(
  client: NotionClient,
  options: SearchOptions = {}
): Promise<NotionSearchResponse> {
  const body: Record<string, unknown> = {};

  if (options.query) {
    body.query = options.query;
  }
  if (options.filter) {
    body.filter = options.filter;
  }
  if (options.sort) {
    body.sort = options.sort;
  }
  if (options.startCursor) {
    body.start_cursor = options.startCursor;
  }
  if (options.pageSize) {
    body.page_size = Math.min(options.pageSize, 100);
  }

  return await client.post<NotionSearchResponse>("/search", body);
}

export async function* searchAll(
  client: NotionClient,
  options: Omit<SearchOptions, "startCursor"> = {}
): AsyncGenerator<NotionPage | NotionDatabase> {
  let cursor: string | undefined;
  let pageNum = 0;
  let totalResults = 0;

  do {
    pageNum += 1;
    logger.info(
      { pageNum, filter: options.filter?.value, cursor: cursor?.slice(0, 20) },
      "Fetching Notion search page"
    );

    const response = await search(client, {
      ...options,
      startCursor: cursor,
      pageSize: options.pageSize ?? 100,
    });

    totalResults += response.results.length;
    logger.info(
      {
        pageNum,
        resultsInPage: response.results.length,
        totalResults,
        hasMore: response.has_more,
        nextCursor: response.next_cursor?.slice(0, 20),
      },
      "Notion search page received"
    );

    for (const result of response.results) {
      yield result;
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  logger.info(
    { totalResults, filter: options.filter?.value },
    "Notion search completed"
  );
}

export async function* searchPages(
  client: NotionClient,
  options: Omit<SearchOptions, "filter" | "startCursor"> = {}
): AsyncGenerator<NotionPage> {
  for await (const result of searchAll(client, {
    ...options,
    filter: { property: "object", value: "page" },
  })) {
    if (result.object === "page") {
      yield result as NotionPage;
    }
  }
}

export async function* searchDatabases(
  client: NotionClient,
  options: Omit<SearchOptions, "filter" | "startCursor"> = {}
): AsyncGenerator<NotionDatabase> {
  for await (const result of searchAll(client, {
    ...options,
    filter: { property: "object", value: "database" },
  })) {
    if (result.object === "database") {
      yield result as NotionDatabase;
    }
  }
}
