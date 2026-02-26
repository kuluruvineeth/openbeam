import type {
  AgentProvider,
  ToolCallDetail,
} from "@openplane/types/services/daemon";
import type { AgentStreamEventPayload } from "@openplane/types/services/daemon/messages";
import type {
  ActivityLogItem,
  AgentToolCallData,
  AgentToolCallStatus,
  ApplyStreamEventResult,
  AssistantMessageItem,
  CompactionItem,
  StreamItem,
  ThoughtItem,
  TodoEntry,
  TodoListItem,
  ToolCallItem,
  UserMessageItem,
} from "../types";
import { isAgentToolCallItem } from "../types";
import { extractTaskEntriesFromToolCall } from "./tool-call-parsers";

const CARRIAGE_RETURN = /\r/g;
const NON_WHITESPACE = /\S/;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    // biome-ignore lint/suspicious/noBitwiseOperators: integer hash function requires bitwise shift
    hash = (hash << 5) - hash + char;
    // biome-ignore lint/suspicious/noBitwiseOperators: integer hash truncation to 32-bit
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function createTimelineId(
  prefix: string,
  text: string,
  timestamp: Date
): string {
  return `${prefix}_${timestamp.getTime()}_${simpleHash(text)}`;
}

function createUniqueTimelineId(
  state: StreamItem[],
  prefix: string,
  text: string,
  timestamp: Date
): string {
  const base = createTimelineId(prefix, text, timestamp);
  const suffixSeed = state.length;
  return `${base}_${suffixSeed.toString(36)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeChunk(text: string): { chunk: string; hasContent: boolean } {
  if (!text) {
    return { chunk: "", hasContent: false };
  }
  const chunk = text.replace(CARRIAGE_RETURN, "");
  if (!chunk) {
    return { chunk: "", hasContent: false };
  }
  return { chunk, hasContent: NON_WHITESPACE.test(chunk) };
}

function markThoughtReady(item: ThoughtItem): ThoughtItem {
  if (item.status === "ready") {
    return item;
  }
  return { ...item, status: "ready" };
}

function appendUserMessage(
  state: StreamItem[],
  text: string,
  timestamp: Date,
  messageId?: string
): StreamItem[] {
  const { chunk, hasContent } = normalizeChunk(text);
  if (!hasContent) {
    return state;
  }

  const chunkSeed = chunk.trim() || chunk;
  const entryId =
    messageId ?? createUniqueTimelineId(state, "user", chunkSeed, timestamp);
  const existingIndex = state.findIndex(
    (entry) => entry.kind === "user_message" && entry.id === entryId
  );
  const existing =
    existingIndex >= 0 && state[existingIndex]?.kind === "user_message"
      ? (state[existingIndex] as UserMessageItem)
      : null;
  const preservedImages = existing?.images;

  const nextItem: UserMessageItem = {
    kind: "user_message",
    id: entryId,
    text: chunk,
    timestamp,
    ...(preservedImages && preservedImages.length > 0
      ? { images: preservedImages }
      : {}),
  };

  if (existingIndex >= 0) {
    const next = [...state];
    next[existingIndex] = nextItem;
    return next;
  }

  return [...state, nextItem];
}

function appendAssistantMessage(
  state: StreamItem[],
  text: string,
  timestamp: Date
): StreamItem[] {
  const { chunk, hasContent } = normalizeChunk(text);
  if (!chunk) {
    return state;
  }

  const last = state.at(-1);
  if (last && last.kind === "assistant_message") {
    const updated: AssistantMessageItem = {
      ...last,
      text: `${last.text}${chunk}`,
      timestamp,
    };
    return [...state.slice(0, -1), updated];
  }

  const secondLast = state.at(-2);
  if (
    last?.kind === "user_message" &&
    secondLast?.kind === "assistant_message"
  ) {
    const updated: AssistantMessageItem = {
      ...secondLast,
      text: `${secondLast.text}${chunk}`,
      timestamp,
    };
    return [...state.slice(0, -2), updated, last];
  }

  if (!hasContent) {
    return state;
  }

  const idSeed = chunk.trim() || chunk;
  const item: AssistantMessageItem = {
    kind: "assistant_message",
    id: createUniqueTimelineId(state, "assistant", idSeed, timestamp),
    text: chunk,
    timestamp,
  };
  return [...state, item];
}

function appendThought(
  state: StreamItem[],
  text: string,
  timestamp: Date
): StreamItem[] {
  const { chunk, hasContent } = normalizeChunk(text);
  if (!chunk) {
    return state;
  }

  const last = state.at(-1);
  if (last && last.kind === "thought") {
    const updated: ThoughtItem = {
      ...last,
      text: `${last.text}${chunk}`,
      timestamp,
      status: "loading",
    };
    return [...state.slice(0, -1), updated];
  }

  if (!hasContent) {
    return state;
  }

  const idSeed = chunk.trim() || chunk;
  const item: ThoughtItem = {
    kind: "thought",
    id: createUniqueTimelineId(state, "thought", idSeed, timestamp),
    text: chunk,
    timestamp,
    status: "loading",
  };
  return [...state, item];
}

function finalizeActiveThoughts(state: StreamItem[]): StreamItem[] {
  let mutated = false;
  const nextState = state.map((entry) => {
    if (entry.kind === "thought" && entry.status !== "ready") {
      mutated = true;
      return markThoughtReady(entry);
    }
    return entry;
  });
  return mutated ? nextState : state;
}

function findExistingAgentToolCallIndex(
  state: StreamItem[],
  callId: string
): number {
  return state.findIndex(
    (entry) =>
      entry.kind === "tool_call" &&
      entry.payload.source === "agent" &&
      entry.payload.data.callId === callId
  );
}

function hasNonEmptyObject(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length > 0;
}

function mergeUnknownValue(
  existing: unknown | null,
  incoming: unknown | null
): unknown | null {
  if (incoming === null) {
    return existing;
  }
  if (!hasNonEmptyObject(incoming) && hasNonEmptyObject(existing)) {
    return existing;
  }
  return incoming;
}

function mergeToolCallDetail(
  existing: ToolCallDetail,
  incoming: ToolCallDetail
): ToolCallDetail {
  if (existing.type === "unknown" && incoming.type !== "unknown") {
    return incoming;
  }
  if (incoming.type === "unknown" && existing.type !== "unknown") {
    return existing;
  }

  if (existing.type === "unknown" && incoming.type === "unknown") {
    return {
      type: "unknown",
      input: mergeUnknownValue(existing.input, incoming.input),
      output: mergeUnknownValue(existing.output, incoming.output),
    };
  }

  if (existing.type === incoming.type) {
    return { ...existing, ...incoming } as ToolCallDetail;
  }

  return incoming;
}

function inputFromUnknownDetail(detail: ToolCallDetail): unknown | null {
  return detail.type === "unknown" ? detail.input : null;
}

function mergeAgentToolCallStatus(
  existing: AgentToolCallStatus,
  incoming: AgentToolCallStatus
): AgentToolCallStatus {
  if (existing === "failed" || incoming === "failed") {
    return "failed";
  }
  if (existing === "canceled") {
    return "canceled";
  }
  if (incoming === "canceled") {
    return existing === "completed" ? "completed" : "canceled";
  }
  if (existing === "completed" || incoming === "completed") {
    return "completed";
  }
  return "running";
}

function appendAgentToolCall(
  state: StreamItem[],
  data: AgentToolCallData,
  timestamp: Date
): StreamItem[] {
  const existingIndex = findExistingAgentToolCallIndex(state, data.callId);

  if (existingIndex >= 0) {
    const next = [...state];
    const existing = next[existingIndex];
    if (!(existing && isAgentToolCallItem(existing))) {
      return state;
    }

    const mergedStatus = mergeAgentToolCallStatus(
      existing.payload.data.status,
      data.status
    );
    const mergedError =
      mergedStatus === "failed"
        ? (data.error ??
          existing.payload.data.error ?? {
            message: "Tool call failed",
          })
        : null;
    const mergedMetadata =
      data.metadata || existing.payload.data.metadata
        ? { ...existing.payload.data.metadata, ...data.metadata }
        : undefined;
    const mergedDetail = mergeToolCallDetail(
      existing.payload.data.detail,
      data.detail
    );

    next[existingIndex] = {
      ...existing,
      timestamp,
      payload: {
        source: "agent",
        data: {
          ...existing.payload.data,
          ...data,
          status: mergedStatus,
          error: mergedError,
          detail: mergedDetail,
          metadata: mergedMetadata,
        },
      },
    };
    return next;
  }

  const item: ToolCallItem = {
    kind: "tool_call",
    id: `agent_tool_${data.callId}`,
    timestamp,
    payload: {
      source: "agent",
      data: {
        ...data,
        error: data.status === "failed" ? data.error : null,
      },
    },
  };

  return [...state, item];
}

function appendActivityLog(
  state: StreamItem[],
  entry: ActivityLogItem
): StreamItem[] {
  const index = state.findIndex((existing) => existing.id === entry.id);
  if (index >= 0) {
    const next = [...state];
    next[index] = entry;
    return next;
  }
  return [...state, entry];
}

function appendTodoList(
  state: StreamItem[],
  provider: AgentProvider,
  items: TodoEntry[],
  timestamp: Date
): StreamItem[] {
  const normalizedItems = items.map((item) => ({
    text: item.text,
    completed: Boolean(item.completed),
  }));

  const lastItem = state.at(-1);
  if (
    lastItem &&
    lastItem.kind === "todo_list" &&
    lastItem.provider === provider
  ) {
    const next = [...state];
    const updated: TodoListItem = {
      ...lastItem,
      items: normalizedItems,
      timestamp,
    };
    next[next.length - 1] = updated;
    return next;
  }

  const idSeed = `${provider}:${JSON.stringify(normalizedItems)}`;
  const entryId = createUniqueTimelineId(state, "todo", idSeed, timestamp);

  const entry: TodoListItem = {
    kind: "todo_list",
    id: entryId,
    timestamp,
    provider,
    items: normalizedItems,
  };

  return [...state, entry];
}

function formatErrorMessage(message: string): string {
  return `Agent error\n${message}`;
}

export function reduceStreamUpdate(
  state: StreamItem[],
  event: AgentStreamEventPayload,
  timestamp: Date
): StreamItem[] {
  switch (event.type) {
    case "timeline": {
      const item = event.item;
      let nextState = state;
      switch (item.type) {
        case "user_message":
          nextState = appendUserMessage(
            state,
            item.text,
            timestamp,
            item.messageId
          );
          break;
        case "assistant_message":
          nextState = appendAssistantMessage(state, item.text, timestamp);
          break;
        case "reasoning":
          return appendThought(state, item.text, timestamp);
        case "tool_call": {
          const normalizedToolName = item.name
            .trim()
            .replace(/[.\s-]+/g, "_")
            .toLowerCase();

          if (
            event.provider === "claude" &&
            normalizedToolName === "exitplanmode"
          ) {
            break;
          }

          if (
            event.provider === "claude" &&
            (normalizedToolName === "todowrite" ||
              normalizedToolName === "todo_write")
          ) {
            const tasks = extractTaskEntriesFromToolCall(
              item.name,
              inputFromUnknownDetail(item.detail)
            );
            if (tasks) {
              nextState = appendTodoList(
                state,
                event.provider,
                tasks.map((entry) => ({
                  text: entry.text,
                  completed: entry.completed,
                })),
                timestamp
              );
            }
            break;
          }

          const tasks = extractTaskEntriesFromToolCall(
            item.name,
            inputFromUnknownDetail(item.detail)
          );
          if (tasks) {
            nextState = appendTodoList(
              state,
              event.provider,
              tasks.map((entry) => ({
                text: entry.text,
                completed: entry.completed,
              })),
              timestamp
            );
            break;
          }

          nextState = appendAgentToolCall(
            state,
            {
              provider: event.provider,
              callId: item.callId,
              name: item.name,
              status: item.status,
              error: item.error,
              detail: item.detail,
              metadata: item.metadata,
            },
            timestamp
          );
          break;
        }
        case "todo": {
          if (event.provider === "claude") {
            break;
          }
          const items: TodoEntry[] = (item.items ?? []).map((todo) => ({
            text: todo.text,
            completed: Boolean(todo.completed),
          }));
          nextState = appendTodoList(state, event.provider, items, timestamp);
          break;
        }
        case "error": {
          const activity: ActivityLogItem = {
            kind: "activity_log",
            id: createTimelineId("error", item.message ?? "", timestamp),
            timestamp,
            activityType: "error",
            message: formatErrorMessage(item.message ?? "Unknown error"),
          };
          nextState = appendActivityLog(state, activity);
          break;
        }
        case "compaction": {
          if (item.status === "completed") {
            const loadingIdx = state.findIndex(
              (s) => s.kind === "compaction" && s.status === "loading"
            );
            if (loadingIdx >= 0) {
              const existing = state[loadingIdx];
              if (!existing || existing.kind !== "compaction") {
                break;
              }
              const updated: CompactionItem = {
                ...existing,
                status: "completed",
                trigger: item.trigger,
                preTokens: item.preTokens,
              };
              nextState = [
                ...state.slice(0, loadingIdx),
                updated,
                ...state.slice(loadingIdx + 1),
              ];
              break;
            }
          }
          const compaction: CompactionItem = {
            kind: "compaction",
            id: createTimelineId("compaction", item.status, timestamp),
            timestamp,
            status: item.status,
            trigger: item.trigger,
            preTokens: item.preTokens,
          };
          nextState = [...state, compaction];
          break;
        }
        default:
          return state;
      }
      return finalizeActiveThoughts(nextState);
    }
    case "thread_started":
    case "turn_started":
    case "turn_completed":
    case "turn_failed":
    case "turn_canceled":
    case "permission_requested":
    case "permission_resolved":
    case "attention_required":
      return finalizeActiveThoughts(state);
    default:
      return state;
  }
}

export function hydrateStreamState(
  events: Array<{ event: AgentStreamEventPayload; timestamp: Date }>
): StreamItem[] {
  const hydrated = events.reduce<StreamItem[]>(
    (state, { event, timestamp }) =>
      reduceStreamUpdate(state, event, timestamp),
    []
  );
  return finalizeActiveThoughts(hydrated);
}

type StreamableKind = "assistant_message" | "thought";

const STREAMABLE_KINDS = new Set<StreamItem["kind"]>([
  "assistant_message",
  "thought",
]);

function isStreamableKind(kind: StreamItem["kind"]): kind is StreamableKind {
  return STREAMABLE_KINDS.has(kind);
}

const STREAM_COMPLETION_EVENTS = new Set<AgentStreamEventPayload["type"]>([
  "turn_completed",
  "turn_failed",
  "turn_canceled",
]);

function getEventItemKind(
  event: AgentStreamEventPayload
): StreamItem["kind"] | null {
  if (event.type !== "timeline") {
    return null;
  }
  switch (event.item.type) {
    case "user_message":
      return "user_message";
    case "assistant_message":
      return "assistant_message";
    case "reasoning":
      return "thought";
    case "tool_call":
      return "tool_call";
    case "todo":
      return "todo_list";
    case "error":
      return "activity_log";
    default:
      return null;
  }
}

function finalizeHeadItems(head: StreamItem[]): StreamItem[] {
  return head.map((item) => {
    if (item.kind === "thought" && item.status !== "ready") {
      return markThoughtReady(item);
    }
    return item;
  });
}

function flushHeadToTail(tail: StreamItem[], head: StreamItem[]): StreamItem[] {
  if (head.length === 0) {
    return tail;
  }

  const finalized = finalizeHeadItems(head);
  const tailIds = new Set(tail.map((item) => item.id));
  const newItems = finalized.filter((item) => !tailIds.has(item.id));

  if (newItems.length === 0) {
    return tail;
  }
  return [...tail, ...newItems];
}

function shouldFlushHead(
  head: StreamItem[],
  incomingKind: StreamItem["kind"] | null
): boolean {
  if (head.length === 0) {
    return false;
  }
  if (incomingKind === null) {
    return false;
  }
  if (!isStreamableKind(incomingKind)) {
    return true;
  }

  let lastStreamable: StreamItem | undefined;
  for (let i = head.length - 1; i >= 0; i--) {
    if (isStreamableKind(head[i].kind)) {
      lastStreamable = head[i];
      break;
    }
  }

  if (!lastStreamable) {
    return true;
  }
  if (lastStreamable.kind !== incomingKind) {
    return true;
  }
  return false;
}

export function applyStreamEvent(params: {
  tail: StreamItem[];
  head: StreamItem[];
  event: AgentStreamEventPayload;
  timestamp: Date;
}): ApplyStreamEventResult {
  const { tail, head, event, timestamp } = params;
  let nextTail = tail;
  let nextHead = head;
  let changedTail = false;
  let changedHead = false;

  const doFlush = () => {
    if (nextHead.length === 0) {
      return;
    }
    const flushed = flushHeadToTail(nextTail, nextHead);
    if (flushed !== nextTail) {
      nextTail = flushed;
      changedTail = true;
    }
    nextHead = [];
    changedHead = true;
  };

  if (STREAM_COMPLETION_EVENTS.has(event.type)) {
    doFlush();
    const finalized = finalizeActiveThoughts(nextTail);
    if (finalized !== nextTail) {
      nextTail = finalized;
      changedTail = true;
    }
    return { tail: nextTail, head: nextHead, changedTail, changedHead };
  }

  const incomingKind = getEventItemKind(event);

  if (shouldFlushHead(nextHead, incomingKind)) {
    doFlush();
  }

  if (incomingKind !== null && isStreamableKind(incomingKind)) {
    const reduced = reduceStreamUpdate(nextHead, event, timestamp);
    if (reduced !== nextHead) {
      nextHead = reduced;
      changedHead = true;
    }
    return { tail: nextTail, head: nextHead, changedTail, changedHead };
  }

  const reduced = reduceStreamUpdate(nextTail, event, timestamp);
  if (reduced !== nextTail) {
    nextTail = reduced;
    changedTail = true;
  }

  return { tail: nextTail, head: nextHead, changedTail, changedHead };
}
