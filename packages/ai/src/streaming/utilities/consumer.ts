import type { AgentEvent } from "@openbeam/types/ai";
import type { AgentStreamChunk } from "../../agents/base";
import {
  type AgentStreamAdapterOptions,
  adaptAgentStream,
} from "../adapters/agent-stream";
import {
  createStreamState,
  getStreamMetrics,
  type StreamMetrics,
  type StreamState,
  updateStateFromEvent,
} from "./state";
import { StreamTimeoutError, withTimeout } from "./timeout";

export interface StreamConsumerOptions extends AgentStreamAdapterOptions {
  timeoutMs?: number;
  onError?: (error: Error) => void;
  onComplete?: (metrics: StreamMetrics) => void;
}

export interface StreamConsumer<TAccumulated = unknown> {
  events(): AsyncGenerator<AgentEvent>;
  getState(): Readonly<StreamState<TAccumulated>>;
  getMetrics(): StreamMetrics;
  abort(): void;
}

function applyTimeout(
  adapted: AsyncGenerator<AgentEvent>,
  timeoutMs: number | undefined
): AsyncGenerator<AgentEvent> {
  if (!timeoutMs) {
    return adapted;
  }
  return withTimeout(adapted, { timeoutMs }) as AsyncGenerator<AgentEvent>;
}

function handleStreamError(
  err: unknown,
  state: StreamState<unknown>,
  onError?: (error: Error) => void
): void {
  const error = err instanceof Error ? err : new Error(String(err));
  state.error = error;
  onError?.(error);

  if (!(err instanceof StreamTimeoutError)) {
    throw error;
  }
}

export function createStreamConsumer<TAccumulated = unknown>(
  source: AsyncGenerator<AgentStreamChunk>,
  options: StreamConsumerOptions = {},
  initialAccumulated?: TAccumulated
): StreamConsumer<TAccumulated> {
  const state = createStreamState(initialAccumulated ?? ({} as TAccumulated));
  const abortController = new AbortController();

  async function* generateEvents(): AsyncGenerator<AgentEvent> {
    try {
      const adapted = applyTimeout(
        adaptAgentStream(source, options),
        options.timeoutMs
      );

      for await (const event of adapted) {
        if (abortController.signal.aborted) {
          break;
        }
        updateStateFromEvent(state, event);
        yield event;
      }

      state.completed = true;
      state.timing.endTime = Date.now();
      options.onComplete?.(getStreamMetrics(state));
    } catch (err) {
      handleStreamError(err, state, options.onError);
    }
  }

  return {
    events: generateEvents,
    getState: () => state,
    getMetrics: () => getStreamMetrics(state),
    abort: () => abortController.abort(),
  };
}

export async function consumeToCompletion<TAccumulated = unknown>(
  source: AsyncGenerator<AgentStreamChunk>,
  options: StreamConsumerOptions = {},
  initialAccumulated?: TAccumulated
): Promise<{
  events: AgentEvent[];
  state: StreamState<TAccumulated>;
  metrics: StreamMetrics;
}> {
  const consumer = createStreamConsumer(source, options, initialAccumulated);
  const events: AgentEvent[] = [];

  for await (const event of consumer.events()) {
    events.push(event);
  }

  return {
    events,
    state: consumer.getState() as StreamState<TAccumulated>,
    metrics: consumer.getMetrics(),
  };
}

export async function* pipeWithTransform<TOutput>(
  source: AsyncGenerator<AgentStreamChunk>,
  transform: (event: AgentEvent) => TOutput | TOutput[] | null,
  options: StreamConsumerOptions = {}
): AsyncGenerator<TOutput> {
  const consumer = createStreamConsumer(source, options);

  for await (const event of consumer.events()) {
    const result = transform(event);

    if (result === null) {
      continue;
    }

    if (Array.isArray(result)) {
      for (const item of result) {
        yield item;
      }
    } else {
      yield result;
    }
  }
}
