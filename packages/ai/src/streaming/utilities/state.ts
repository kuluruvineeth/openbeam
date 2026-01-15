import type { AgentEvent, AgentStatus } from "../events";

/**
 * Stream State Utilities
 *
 * Provides state accumulation for streaming operations.
 * Use these to track progress, collect results, and manage timing.
 */

export interface StreamTiming {
  startTime: number;
  firstChunkTime?: number;
  lastChunkTime?: number;
  endTime?: number;
}

export interface StreamState<TAccumulated = unknown> {
  timing: StreamTiming;
  chunkCount: number;
  textContent: string;
  toolCalls: Map<string, ToolCallState>;
  currentStatus?: AgentStatus;
  accumulated: TAccumulated;
  error?: Error;
  completed: boolean;
}

export interface ToolCallState {
  toolName: string;
  startTime: number;
  endTime?: number;
  input?: unknown;
  output?: unknown;
  success?: boolean;
}

export function createStreamState<TAccumulated = unknown>(
  initialAccumulated: TAccumulated
): StreamState<TAccumulated> {
  return {
    timing: { startTime: Date.now() },
    chunkCount: 0,
    textContent: "",
    toolCalls: new Map(),
    accumulated: initialAccumulated,
    completed: false,
  };
}

export function updateStateFromEvent<TAccumulated>(
  state: StreamState<TAccumulated>,
  event: AgentEvent
): StreamState<TAccumulated> {
  const now = Date.now();

  state.chunkCount += 1;
  state.timing.lastChunkTime = now;

  if (!state.timing.firstChunkTime) {
    state.timing.firstChunkTime = now;
  }

  switch (event.type) {
    case "text":
      state.textContent += event.content;
      break;

    case "status":
      state.currentStatus = event.status;
      break;

    case "tool_call":
      state.toolCalls.set(event.toolCallId, {
        toolName: event.toolName,
        startTime: now,
        input: event.toolInput,
      });
      break;

    case "tool_result": {
      const existing = state.toolCalls.get(event.toolCallId);
      if (existing) {
        existing.endTime = now;
        existing.output = event.toolOutput;
        existing.success = event.success;
      }
      break;
    }

    case "error":
      state.error = new Error(event.message);
      break;

    case "done":
      state.completed = true;
      state.timing.endTime = now;
      break;

    default:
      break;
  }

  return state;
}

export function getStreamMetrics(state: StreamState): StreamMetrics {
  const { timing, chunkCount, toolCalls, textContent } = state;

  const totalDurationMs = timing.endTime
    ? timing.endTime - timing.startTime
    : Date.now() - timing.startTime;

  const firstChunkLatencyMs = timing.firstChunkTime
    ? timing.firstChunkTime - timing.startTime
    : undefined;

  const toolCallDurations: number[] = [];
  for (const tc of toolCalls.values()) {
    if (tc.endTime) {
      toolCallDurations.push(tc.endTime - tc.startTime);
    }
  }

  return {
    totalDurationMs,
    firstChunkLatencyMs,
    chunkCount,
    textLength: textContent.length,
    toolCallCount: toolCalls.size,
    completedToolCalls: toolCallDurations.length,
    avgToolCallDurationMs:
      toolCallDurations.length > 0
        ? toolCallDurations.reduce((a, b) => a + b, 0) /
          toolCallDurations.length
        : undefined,
  };
}

export interface StreamMetrics {
  totalDurationMs: number;
  firstChunkLatencyMs?: number;
  chunkCount: number;
  textLength: number;
  toolCallCount: number;
  completedToolCalls: number;
  avgToolCallDurationMs?: number;
}

export async function* withStateTracking<TAccumulated = unknown>(
  source: AsyncGenerator<AgentEvent>,
  initialAccumulated: TAccumulated,
  onStateChange?: (state: StreamState<TAccumulated>) => void
): AsyncGenerator<AgentEvent, StreamState<TAccumulated>> {
  const state = createStreamState(initialAccumulated);

  for await (const event of source) {
    updateStateFromEvent(state, event);
    onStateChange?.(state);
    yield event;
  }

  return state;
}

export class StreamStateAccumulator<TAccumulated = unknown> {
  private readonly state: StreamState<TAccumulated>;
  private readonly listeners: Set<(state: StreamState<TAccumulated>) => void> =
    new Set();

  constructor(initialAccumulated: TAccumulated) {
    this.state = createStreamState(initialAccumulated);
  }

  process(event: AgentEvent): void {
    updateStateFromEvent(this.state, event);
    this.notify();
  }

  getState(): Readonly<StreamState<TAccumulated>> {
    return this.state;
  }

  getMetrics(): StreamMetrics {
    return getStreamMetrics(this.state);
  }

  onStateChange(
    listener: (state: StreamState<TAccumulated>) => void
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  updateAccumulated(updater: (current: TAccumulated) => TAccumulated): void {
    this.state.accumulated = updater(this.state.accumulated);
    this.notify();
  }
}
