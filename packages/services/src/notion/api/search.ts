import type { NotionClient } from "../client";
import type {
  NotionDatabase,
  NotionPage,
  NotionSearchResponse,
} from "../types";

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

  do {
    const response = await search(client, {
      ...options,
      startCursor: cursor,
      pageSize: options.pageSize ?? 100,
    });

    for (const result of response.results) {
      yield result;
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
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
