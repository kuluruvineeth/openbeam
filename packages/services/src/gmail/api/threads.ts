import {
  type GmailListThreadsResponse,
  GmailListThreadsResponseSchema,
  type GmailThread,
  GmailThreadSchema,
} from "@openbeam/types/services/connectors/gmail";
import { logger } from "../../lib/logger";
import type { GmailClient } from "../client";

export interface FetchThreadsOptions {
  labelIds?: string[];
  query?: string;
  maxResults?: number;
  pageToken?: string;
  includeSpamTrash?: boolean;
}

export interface FetchThreadOptions {
  format?: "minimal" | "full" | "metadata";
  metadataHeaders?: string[];
}

export interface ThreadListItem {
  id: string;
  snippet?: string;
  historyId?: string;
}

export async function* fetchThreadIds(
  client: GmailClient,
  options: FetchThreadsOptions = {}
): AsyncGenerator<ThreadListItem, void, undefined> {
  const {
    labelIds,
    query,
    maxResults = 500,
    includeSpamTrash = false,
  } = options;
  let pageToken = options.pageToken;
  let fetched = 0;

  do {
    const params: Record<string, string | number | boolean | undefined> = {
      maxResults: Math.min(maxResults - fetched, 500),
      pageToken,
      includeSpamTrash,
    };

    if (labelIds?.length) {
      params.labelIds = labelIds.join(",");
    }
    if (query) {
      params.q = query;
    }

    const response = await client.get<GmailListThreadsResponse>(
      "/users/me/threads",
      params
    );

    logger.info(
      {
        params,
        threadCount: response.threads?.length ?? 0,
        hasNextPage: !!response.nextPageToken,
        resultSizeEstimate: response.resultSizeEstimate,
      },
      "Gmail threads.list API response"
    );

    const parsed = GmailListThreadsResponseSchema.safeParse(response);
    if (!parsed.success) {
      logger.warn(
        { error: parsed.error.message },
        "Gmail threads.list response failed parsing"
      );
      continue;
    }

    const threads = parsed.data.threads ?? [];
    for (const thread of threads) {
      yield thread;
      fetched += 1;
      if (fetched >= maxResults) {
        return;
      }
    }

    pageToken = parsed.data.nextPageToken;
  } while (pageToken && fetched < maxResults);
}

export async function getThread(
  client: GmailClient,
  threadId: string,
  options: FetchThreadOptions = {}
): Promise<GmailThread | null> {
  const { format = "full", metadataHeaders } = options;

  const params: Record<string, string | undefined> = {
    format,
  };

  if (metadataHeaders?.length) {
    params.metadataHeaders = metadataHeaders.join(",");
  }

  const response = await client.get<GmailThread>(
    `/users/me/threads/${threadId}`,
    params
  );

  const parsed = GmailThreadSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function batchGetThreads(
  client: GmailClient,
  threadIds: string[],
  options: FetchThreadOptions = {}
): Promise<GmailThread[]> {
  const { format = "full" } = options;

  if (threadIds.length === 0) {
    return [];
  }

  const batchSize = 100;
  const results: GmailThread[] = [];

  for (let i = 0; i < threadIds.length; i += batchSize) {
    const batch = threadIds.slice(i, i + batchSize);
    const paths = batch.map((id) => `/users/me/threads/${id}?format=${format}`);

    const responses = await client.batchGet<GmailThread>(paths);

    logger.info(
      {
        requestedCount: batch.length,
        responseCount: responses.length,
        hasMessages: responses.filter((r) => r?.messages?.length).length,
      },
      "Gmail batch get threads response"
    );

    for (const response of responses) {
      if (!response || (response as { error?: unknown }).error) {
        continue;
      }
      const parsed = GmailThreadSchema.safeParse(response);
      if (parsed.success) {
        results.push(parsed.data);
      } else {
        logger.warn(
          { error: parsed.error.message, threadId: response?.id },
          "Gmail thread parsing failed"
        );
      }
    }
  }

  return results;
}

export async function* fetchThreadsWithMessages(
  client: GmailClient,
  options: FetchThreadsOptions & FetchThreadOptions = {}
): AsyncGenerator<GmailThread, void, undefined> {
  const threadItems: ThreadListItem[] = [];
  const batchSize = 50;

  for await (const item of fetchThreadIds(client, options)) {
    threadItems.push(item);

    if (threadItems.length >= batchSize) {
      const threads = await batchGetThreads(
        client,
        threadItems.map((t) => t.id),
        options
      );
      for (const thread of threads) {
        yield thread;
      }
      threadItems.length = 0;
    }
  }

  if (threadItems.length > 0) {
    const threads = await batchGetThreads(
      client,
      threadItems.map((t) => t.id),
      options
    );
    for (const thread of threads) {
      yield thread;
    }
  }
}

export function getThreadParticipants(thread: GmailThread): string[] {
  const participants = new Set<string>();

  for (const message of thread.messages ?? []) {
    const headers = message.payload?.headers ?? [];

    for (const header of headers) {
      if (["From", "To", "Cc"].includes(header.name)) {
        const emails = extractEmails(header.value);
        for (const email of emails) {
          participants.add(email.toLowerCase());
        }
      }
    }
  }

  return Array.from(participants);
}

function extractEmails(headerValue: string): string[] {
  const emailRegex = /[\w.+-]+@[\w.-]+\.\w+/g;
  return headerValue.match(emailRegex) ?? [];
}
