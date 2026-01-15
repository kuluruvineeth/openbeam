import {
  type GmailListMessagesResponse,
  GmailListMessagesResponseSchema,
  type GmailMessage,
  type GmailMessageListItem,
  GmailMessageSchema,
} from "@openplane/types/services/connectors/gmail";
import type { GmailClient } from "../client";

export interface FetchMessagesOptions {
  labelIds?: string[];
  query?: string;
  maxResults?: number;
  pageToken?: string;
  includeSpamTrash?: boolean;
}

export interface FetchMessageOptions {
  format?: "minimal" | "full" | "raw" | "metadata";
  metadataHeaders?: string[];
}

export async function* fetchMessageIds(
  client: GmailClient,
  options: FetchMessagesOptions = {}
): AsyncGenerator<GmailMessageListItem, void, undefined> {
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

    const response = await client.get<GmailListMessagesResponse>(
      "/users/me/messages",
      params
    );

    const parsed = GmailListMessagesResponseSchema.safeParse(response);
    if (!parsed.success) {
      continue;
    }

    const messages = parsed.data.messages ?? [];
    for (const message of messages) {
      yield message;
      fetched += 1;
      if (fetched >= maxResults) {
        return;
      }
    }

    pageToken = parsed.data.nextPageToken;
  } while (pageToken && fetched < maxResults);
}

export async function getMessage(
  client: GmailClient,
  messageId: string,
  options: FetchMessageOptions = {}
): Promise<GmailMessage | null> {
  const { format = "full", metadataHeaders } = options;

  const params: Record<string, string | undefined> = {
    format,
  };

  if (metadataHeaders?.length) {
    params.metadataHeaders = metadataHeaders.join(",");
  }

  const response = await client.get<GmailMessage>(
    `/users/me/messages/${messageId}`,
    params
  );

  const parsed = GmailMessageSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function batchGetMessages(
  client: GmailClient,
  messageIds: string[],
  options: FetchMessageOptions = {}
): Promise<GmailMessage[]> {
  const { format = "full" } = options;

  if (messageIds.length === 0) {
    return [];
  }

  const batchSize = 100;
  const results: GmailMessage[] = [];

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const paths = batch.map(
      (id) => `/users/me/messages/${id}?format=${format}`
    );

    const responses = await client.batchGet<GmailMessage>(paths);

    for (const response of responses) {
      if (!response || (response as { error?: unknown }).error) {
        continue;
      }
      const parsed = GmailMessageSchema.safeParse(response);
      if (parsed.success) {
        results.push(parsed.data);
      }
    }
  }

  return results;
}

export async function* fetchMessagesWithContent(
  client: GmailClient,
  options: FetchMessagesOptions & FetchMessageOptions = {}
): AsyncGenerator<GmailMessage, void, undefined> {
  const messageIds: string[] = [];
  const batchSize = 100;

  for await (const item of fetchMessageIds(client, options)) {
    messageIds.push(item.id);

    if (messageIds.length >= batchSize) {
      const messages = await batchGetMessages(client, messageIds, options);
      for (const message of messages) {
        yield message;
      }
      messageIds.length = 0;
    }
  }

  if (messageIds.length > 0) {
    const messages = await batchGetMessages(client, messageIds, options);
    for (const message of messages) {
      yield message;
    }
  }
}

export async function searchMessages(
  client: GmailClient,
  query: string,
  options: Omit<FetchMessagesOptions, "query"> = {}
): Promise<GmailMessage[]> {
  const messages: GmailMessage[] = [];

  for await (const message of fetchMessagesWithContent(client, {
    ...options,
    query,
  })) {
    messages.push(message);
  }

  return messages;
}
