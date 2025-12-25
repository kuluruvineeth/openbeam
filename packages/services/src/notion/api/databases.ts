import type { NotionClient } from "../client";
import type {
  NotionDatabase,
  NotionDatabaseQueryResponse,
  NotionPage,
} from "../types";

export async function getDatabase(
  client: NotionClient,
  databaseId: string
): Promise<NotionDatabase> {
  return await client.get<NotionDatabase>(`/databases/${databaseId}`);
}

export interface DatabaseQueryFilter {
  property?: string;
  [key: string]: unknown;
}

export interface DatabaseQuerySort {
  property?: string;
  timestamp?: "created_time" | "last_edited_time";
  direction: "ascending" | "descending";
}

export interface QueryDatabaseOptions {
  filter?: DatabaseQueryFilter;
  sorts?: DatabaseQuerySort[];
  startCursor?: string;
  pageSize?: number;
  filterProperties?: string[];
}

export async function queryDatabase(
  client: NotionClient,
  databaseId: string,
  options: QueryDatabaseOptions = {}
): Promise<NotionDatabaseQueryResponse> {
  const body: Record<string, unknown> = {};

  if (options.filter) {
    body.filter = options.filter;
  }
  if (options.sorts) {
    body.sorts = options.sorts;
  }
  if (options.startCursor) {
    body.start_cursor = options.startCursor;
  }
  if (options.pageSize) {
    body.page_size = Math.min(options.pageSize, 100);
  }
  if (options.filterProperties) {
    body.filter_properties = options.filterProperties;
  }

  return await client.post<NotionDatabaseQueryResponse>(
    `/databases/${databaseId}/query`,
    body
  );
}

export async function* queryDatabaseAll(
  client: NotionClient,
  databaseId: string,
  options: Omit<QueryDatabaseOptions, "startCursor"> = {}
): AsyncGenerator<NotionPage> {
  let cursor: string | undefined;

  do {
    const response = await queryDatabase(client, databaseId, {
      ...options,
      startCursor: cursor,
      pageSize: options.pageSize ?? 100,
    });

    for (const page of response.results) {
      yield page;
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
}

export interface CreateDatabaseOptions {
  parent:
    | { type: "page_id"; page_id: string }
    | { type: "block_id"; block_id: string };
  title: Array<{
    type: "text";
    text: { content: string };
  }>;
  properties: Record<string, unknown>;
  icon?:
    | { type: "emoji"; emoji: string }
    | { type: "external"; external: { url: string } };
  cover?: { type: "external"; external: { url: string } };
  is_inline?: boolean;
}

export async function createDatabase(
  client: NotionClient,
  options: CreateDatabaseOptions
): Promise<NotionDatabase> {
  return await client.post<NotionDatabase>("/databases", options);
}

export interface UpdateDatabaseOptions {
  title?: Array<{
    type: "text";
    text: { content: string };
  }>;
  description?: Array<{
    type: "text";
    text: { content: string };
  }>;
  properties?: Record<string, unknown>;
  icon?:
    | { type: "emoji"; emoji: string }
    | { type: "external"; external: { url: string } }
    | null;
  cover?: { type: "external"; external: { url: string } } | null;
  archived?: boolean;
  is_inline?: boolean;
}

export async function updateDatabase(
  client: NotionClient,
  databaseId: string,
  options: UpdateDatabaseOptions
): Promise<NotionDatabase> {
  return await client.patch<NotionDatabase>(
    `/databases/${databaseId}`,
    options
  );
}
