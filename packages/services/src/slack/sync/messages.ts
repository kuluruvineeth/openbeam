import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import {
  type FetchMessagesOptions,
  fetchMessages,
  fetchThreadReplies,
} from "../api/messages";
import { createUserLookup, type UserLookup } from "../api/users";
import type { SlackClient } from "../client";
import {
  type MessageTransformContext,
  type MessageTransformOptions,
  transformMessage,
} from "../transformers";
import type {
  SlackChannel,
  SlackMessage,
  SyncBatch,
  SyncCursor,
  TransformContext,
} from "../types";

export interface SyncMessagesOptions {
  cursor?: SyncCursor;
  batchSize?: number;
  includeThreads?: boolean;
  userLookup?: UserLookup;
  channelMembers?: string[];
  transformOptions?: MessageTransformOptions;
}

export interface MessageSyncResult {
  documents: GenericDocument[];
  latestTimestamp?: string;
  stats: {
    messages: number;
    threads: number;
    replies: number;
    errors: number;
  };
}

interface SyncState {
  documents: GenericDocument[];
  latestTimestamp: string | undefined;
  stats: { messages: number; threads: number; replies: number; errors: number };
}

function updateLatestTimestamp(
  current: string | undefined,
  ts: string
): string {
  if (!current || Number(ts) > Number(current)) {
    return ts;
  }
  return current;
}

function buildChannelCursors(
  existing: Record<string, string> | undefined,
  channelId: string,
  timestamp: string | undefined
): Record<string, string> {
  if (!timestamp) {
    return existing ?? {};
  }
  return { ...existing, [channelId]: timestamp };
}

interface ThreadProcessingContext {
  client: SlackClient;
  channel: SlackChannel;
  transformContext: MessageTransformContext;
  transformOptions?: MessageTransformOptions;
  oldest?: string;
}

async function processThreadReplies(
  ctx: ThreadProcessingContext,
  message: SlackMessage,
  state: SyncState
): Promise<void> {
  try {
    const replies = await fetchAllThreadReplies(
      ctx.client,
      ctx.channel.id,
      message.ts,
      ctx.oldest
    );
    state.stats.threads += 1;

    for (const reply of replies) {
      state.stats.replies += 1;
      const replyDoc = transformMessage(
        reply,
        ctx.transformContext,
        ctx.transformOptions
      );
      state.documents.push(replyDoc);
      state.latestTimestamp = updateLatestTimestamp(
        state.latestTimestamp,
        reply.ts
      );
    }
  } catch {
    state.stats.errors += 1;
  }
}

export async function syncChannelMessages(
  client: SlackClient,
  channel: SlackChannel,
  context: TransformContext,
  options: SyncMessagesOptions = {}
): Promise<MessageSyncResult> {
  const {
    cursor,
    includeThreads = true,
    userLookup,
    channelMembers,
    transformOptions,
  } = options;

  const state: SyncState = {
    documents: [],
    latestTimestamp: undefined,
    stats: { messages: 0, threads: 0, replies: 0, errors: 0 },
  };

  const transformContext: MessageTransformContext = {
    ...context,
    channel,
    userLookup,
    channelMembers,
  };

  const fetchOptions: FetchMessagesOptions = cursor?.lastTimestamp
    ? { oldest: cursor.lastTimestamp }
    : {};

  try {
    for await (const message of fetchMessages(
      client,
      channel.id,
      fetchOptions
    )) {
      state.stats.messages += 1;
      const doc = transformMessage(message, transformContext, transformOptions);
      state.documents.push(doc);
      state.latestTimestamp = updateLatestTimestamp(
        state.latestTimestamp,
        message.ts
      );

      if (includeThreads && isThreadWithReplies(message)) {
        const threadCtx: ThreadProcessingContext = {
          client,
          channel,
          transformContext,
          transformOptions,
          oldest: cursor?.lastTimestamp,
        };
        await processThreadReplies(threadCtx, message, state);
      }
    }
  } catch {
    state.stats.errors += 1;
    throw new Error(`Failed to sync messages for channel ${channel.id}`);
  }

  return {
    documents: state.documents,
    latestTimestamp: state.latestTimestamp,
    stats: state.stats,
  };
}

interface BatchState {
  batch: GenericDocument[];
  latestTimestamp: string | undefined;
  stats: { processed: number; skipped: number; errors: number };
}

function createBatchCursor(
  baseCursor: SyncCursor | undefined,
  channelId: string,
  latestTimestamp: string | undefined
): SyncCursor {
  return {
    ...baseCursor,
    lastTimestamp: latestTimestamp,
    channelCursors: buildChannelCursors(
      baseCursor?.channelCursors,
      channelId,
      latestTimestamp
    ),
  };
}

function createBatch(
  state: BatchState,
  channelId: string,
  cursor: SyncCursor | undefined,
  hasMore: boolean
): SyncBatch<GenericDocument> {
  return {
    items: state.batch,
    cursor: createBatchCursor(cursor, channelId, state.latestTimestamp),
    hasMore,
    stats: state.stats,
  };
}

function resetBatchState(): BatchState {
  return {
    batch: [],
    latestTimestamp: undefined,
    stats: { processed: 0, skipped: 0, errors: 0 },
  };
}

export async function* syncChannelMessagesBatched(
  client: SlackClient,
  channel: SlackChannel,
  context: TransformContext,
  options: SyncMessagesOptions = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = 100,
    includeThreads = true,
    userLookup,
    channelMembers,
    transformOptions,
  } = options;

  const transformContext: MessageTransformContext = {
    ...context,
    channel,
    userLookup,
    channelMembers,
  };
  const fetchOptions: FetchMessagesOptions = cursor?.lastTimestamp
    ? { oldest: cursor.lastTimestamp }
    : {};

  let state: BatchState = {
    batch: [],
    latestTimestamp: cursor?.lastTimestamp,
    stats: { processed: 0, skipped: 0, errors: 0 },
  };

  for await (const message of fetchMessages(client, channel.id, fetchOptions)) {
    const doc = transformMessage(message, transformContext, transformOptions);
    state.batch.push(doc);
    state.stats.processed += 1;
    state.latestTimestamp = updateLatestTimestamp(
      state.latestTimestamp,
      message.ts
    );

    if (includeThreads && isThreadWithReplies(message)) {
      const batchedCtx: BatchedThreadContext = {
        client,
        channel,
        transformContext,
        transformOptions,
        cursor,
        batchSize,
      };
      const yieldedState = yield* processThreadRepliesBatched(
        batchedCtx,
        message,
        state
      );
      if (yieldedState) {
        state = yieldedState;
      }
    }

    if (state.batch.length >= batchSize) {
      yield createBatch(state, channel.id, cursor, true);
      state = { ...resetBatchState(), latestTimestamp: state.latestTimestamp };
    }
  }

  if (state.batch.length > 0) {
    yield createBatch(state, channel.id, cursor, false);
  }
}

interface BatchedThreadContext {
  client: SlackClient;
  channel: SlackChannel;
  transformContext: MessageTransformContext;
  transformOptions?: MessageTransformOptions;
  cursor?: SyncCursor;
  batchSize: number;
}

async function* processThreadRepliesBatched(
  ctx: BatchedThreadContext,
  message: SlackMessage,
  initialState: BatchState
): AsyncGenerator<SyncBatch<GenericDocument>, BatchState, undefined> {
  let currentState = initialState;

  try {
    for await (const reply of fetchThreadReplies(
      ctx.client,
      ctx.channel.id,
      message.ts,
      { oldest: ctx.cursor?.lastTimestamp }
    )) {
      const replyDoc = transformMessage(
        reply,
        ctx.transformContext,
        ctx.transformOptions
      );
      currentState.batch.push(replyDoc);
      currentState.stats.processed += 1;
      currentState.latestTimestamp = updateLatestTimestamp(
        currentState.latestTimestamp,
        reply.ts
      );

      if (currentState.batch.length >= ctx.batchSize) {
        yield createBatch(currentState, ctx.channel.id, ctx.cursor, true);
        currentState = {
          ...resetBatchState(),
          latestTimestamp: currentState.latestTimestamp,
        };
      }
    }
  } catch {
    currentState.stats.errors += 1;
  }
  return currentState;
}

export async function* syncMultipleChannels(
  client: SlackClient,
  channels: SlackChannel[],
  context: TransformContext,
  options: SyncMessagesOptions & {
    memberMap?: Map<string, string[]>;
    fetchUsers?: boolean;
  } = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const { memberMap, fetchUsers = true, ...syncOptions } = options;

  let userLookup = syncOptions.userLookup;
  if (!userLookup && fetchUsers) {
    userLookup = await createUserLookup(client);
  }

  for (const channel of channels) {
    const channelMembers = memberMap?.get(channel.id);

    try {
      yield* syncChannelMessagesBatched(client, channel, context, {
        ...syncOptions,
        userLookup,
        channelMembers,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("not_in_channel") ||
        errorMessage.includes("channel_not_found") ||
        errorMessage.includes("is_archived")
      ) {
        logger.warn(
          { channelName: channel.name, channelId: channel.id },
          "Skipping channel: Bot doesn't have access. Add the bot to this channel to sync its messages."
        );
        continue;
      }

      throw error;
    }
  }
}

function isThreadWithReplies(message: SlackMessage): boolean {
  return message.thread_ts === message.ts && (message.reply_count ?? 0) > 0;
}

async function fetchAllThreadReplies(
  client: SlackClient,
  channelId: string,
  threadTs: string,
  oldest?: string
): Promise<SlackMessage[]> {
  const replies: SlackMessage[] = [];

  for await (const reply of fetchThreadReplies(client, channelId, threadTs, {
    oldest,
  })) {
    replies.push(reply);
  }

  return replies;
}
