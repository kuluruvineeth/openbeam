import type { SlackClient } from "../client";
import { type SlackMessage, SlackMessageSchema } from "../types";

export interface FetchMessagesOptions {
  oldest?: string;
  latest?: string;
  limit?: number;
  includeAllMetadata?: boolean;
}

export interface FetchRepliesOptions {
  oldest?: string;
  latest?: string;
  limit?: number;
}

interface ConversationsHistoryResponse {
  ok: boolean;
  messages?: unknown[];
  has_more?: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface ConversationsRepliesResponse {
  ok: boolean;
  messages?: unknown[];
  has_more?: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

export interface MessageWithReplies {
  message: SlackMessage;
  replies: SlackMessage[];
}

export async function* fetchMessages(
  client: SlackClient,
  channelId: string,
  options: FetchMessagesOptions = {}
): AsyncGenerator<SlackMessage, void, undefined> {
  const { oldest, latest, limit = 200, includeAllMetadata = true } = options;

  let cursor: string | undefined;

  do {
    const response = await client.call<ConversationsHistoryResponse>(
      "conversations.history",
      {
        channel: channelId,
        oldest,
        latest,
        limit: Math.min(limit, 1000),
        cursor,
        include_all_metadata: includeAllMetadata,
      }
    );

    const messages = response.messages ?? [];

    for (const rawMessage of messages) {
      const parsed = SlackMessageSchema.safeParse(rawMessage);

      if (!parsed.success) {
        continue;
      }

      yield parsed.data;
    }

    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);
}

export function fetchMessagesSince(
  client: SlackClient,
  channelId: string,
  sinceTimestamp: string,
  options: Omit<FetchMessagesOptions, "oldest"> = {}
): AsyncGenerator<SlackMessage, void, undefined> {
  return fetchMessages(client, channelId, {
    ...options,
    oldest: sinceTimestamp,
  });
}

export async function getAllMessages(
  client: SlackClient,
  channelId: string,
  options: FetchMessagesOptions = {}
): Promise<SlackMessage[]> {
  const messages: SlackMessage[] = [];

  for await (const message of fetchMessages(client, channelId, options)) {
    messages.push(message);
  }

  return messages;
}

export async function fetchSingleMessage(
  client: SlackClient,
  channelId: string,
  ts: string
): Promise<SlackMessage | null> {
  const historyResponse = await client.call<ConversationsHistoryResponse>(
    "conversations.history",
    {
      channel: channelId,
      oldest: ts,
      latest: ts,
      inclusive: true,
      limit: 1,
    }
  );

  const historyMessage = historyResponse.messages?.[0];
  if (historyMessage) {
    const parsed = SlackMessageSchema.safeParse(historyMessage);
    if (parsed.success) {
      return parsed.data;
    }
  }

  const repliesResponse = await client.call<ConversationsRepliesResponse>(
    "conversations.replies",
    {
      channel: channelId,
      ts,
      limit: 1,
    }
  );

  const replyMessage = repliesResponse.messages?.[0];
  if (!replyMessage) {
    return null;
  }

  const parsed = SlackMessageSchema.safeParse(replyMessage);
  return parsed.success ? parsed.data : null;
}

export async function* fetchThreadReplies(
  client: SlackClient,
  channelId: string,
  threadTs: string,
  options: FetchRepliesOptions = {}
): AsyncGenerator<SlackMessage, void, undefined> {
  const { oldest, latest, limit = 200 } = options;

  let cursor: string | undefined;
  let isFirstPage = true;

  do {
    const response = await client.call<ConversationsRepliesResponse>(
      "conversations.replies",
      {
        channel: channelId,
        ts: threadTs,
        oldest,
        latest,
        limit: Math.min(limit, 1000),
        cursor,
      }
    );

    const messages = response.messages ?? [];

    for (let i = 0; i < messages.length; i++) {
      // Skip the parent message (first message on first page)
      if (isFirstPage && i === 0) {
        continue;
      }

      const parsed = SlackMessageSchema.safeParse(messages[i]);

      if (!parsed.success) {
        continue;
      }

      yield parsed.data;
    }

    isFirstPage = false;
    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);
}

export interface FetchThreadRepliesSinceOptions
  extends Omit<FetchRepliesOptions, "oldest"> {
  sinceTimestamp: string;
}

export function fetchThreadRepliesSince(
  client: SlackClient,
  channelId: string,
  threadTs: string,
  options: FetchThreadRepliesSinceOptions
): AsyncGenerator<SlackMessage, void, undefined> {
  const { sinceTimestamp, ...rest } = options;
  return fetchThreadReplies(client, channelId, threadTs, {
    ...rest,
    oldest: sinceTimestamp,
  });
}

export async function getAllThreadReplies(
  client: SlackClient,
  channelId: string,
  threadTs: string,
  options: FetchRepliesOptions = {}
): Promise<SlackMessage[]> {
  const replies: SlackMessage[] = [];

  for await (const reply of fetchThreadReplies(
    client,
    channelId,
    threadTs,
    options
  )) {
    replies.push(reply);
  }

  return replies;
}

export async function* fetchMessagesWithReplies(
  client: SlackClient,
  channelId: string,
  options: FetchMessagesOptions & { includeReplies?: boolean } = {}
): AsyncGenerator<MessageWithReplies, void, undefined> {
  const { includeReplies = true, ...messageOptions } = options;

  for await (const message of fetchMessages(
    client,
    channelId,
    messageOptions
  )) {
    let replies: SlackMessage[] = [];

    // Fetch thread replies if this is a thread parent with replies
    if (
      includeReplies &&
      isThreadParent(message) &&
      (message.reply_count ?? 0) > 0
    ) {
      replies = await getAllThreadReplies(client, channelId, message.ts, {
        oldest: options.oldest,
      });
    }

    yield { message, replies };
  }
}

export function isThreadParent(message: SlackMessage): boolean {
  return message.thread_ts === message.ts;
}

export function isThreadReply(message: SlackMessage): boolean {
  return Boolean(message.thread_ts && message.thread_ts !== message.ts);
}

export function hasReplies(message: SlackMessage): boolean {
  return isThreadParent(message) && (message.reply_count ?? 0) > 0;
}

export function slackTsToMs(ts: string): number {
  return Math.floor(Number.parseFloat(ts) * 1000);
}

export function msToSlackTs(ms: number): string {
  return (ms / 1000).toFixed(6);
}

export function getLatestTimestamp(
  messages: SlackMessage[]
): string | undefined {
  const first = messages[0];
  if (!first) {
    return;
  }

  return messages.reduce(
    (latest, msg) => (Number(msg.ts) > Number(latest) ? msg.ts : latest),
    first.ts
  );
}

export function sortMessagesByTimestamp(
  messages: SlackMessage[],
  direction: "asc" | "desc" = "asc"
): SlackMessage[] {
  return [...messages].sort((a, b) => {
    const diff = Number(a.ts) - Number(b.ts);
    return direction === "asc" ? diff : -diff;
  });
}
