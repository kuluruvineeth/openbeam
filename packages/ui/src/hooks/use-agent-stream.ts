"use client";

import { useCallback, useRef, useState } from "react";

type StreamEventType =
  | "thinking"
  | "status"
  | "tool_call"
  | "tool_result"
  | "text"
  | "error"
  | "done";

interface BaseStreamEvent {
  type: StreamEventType;
  timestamp: number;
}

interface ThinkingEvent extends BaseStreamEvent {
  type: "thinking";
  message: string;
}

interface StatusEvent extends BaseStreamEvent {
  type: "status";
  status: string;
  message: string;
}

interface ToolCallEvent extends BaseStreamEvent {
  type: "tool_call";
  toolCallId: string;
  toolName: string;
  displayName: string;
  toolInput?: unknown;
  visibility: "visible" | "ephemeral" | "hidden";
}

interface ToolResultEvent extends BaseStreamEvent {
  type: "tool_result";
  toolCallId: string;
  toolName: string;
  toolOutput?: unknown;
  durationMs?: number;
  success: boolean;
}

interface TextEvent extends BaseStreamEvent {
  type: "text";
  content: string;
  isPartial: boolean;
}

interface ErrorEvent extends BaseStreamEvent {
  type: "error";
  code: string;
  message: string;
  retryable: boolean;
}

interface DoneEvent extends BaseStreamEvent {
  type: "done";
  success: boolean;
}

type StreamEvent =
  | ThinkingEvent
  | StatusEvent
  | ToolCallEvent
  | ToolResultEvent
  | TextEvent
  | ErrorEvent
  | DoneEvent;

type StreamStatus = "idle" | "connecting" | "streaming" | "error" | "complete";

interface UseAgentStreamOptions {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  onEvent?: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  parseEvent?: (data: string) => StreamEvent | null;
}

interface UseAgentStreamReturn {
  status: StreamStatus;
  events: StreamEvent[];
  error: Error | null;
  start: (body?: unknown) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

interface StreamCallbacks {
  onEvent?: (event: StreamEvent) => void;
  onComplete?: () => void;
  setStatus: (status: StreamStatus) => void;
  setEvents: React.Dispatch<React.SetStateAction<StreamEvent[]>>;
}

interface LineProcessResult {
  shouldBreak: boolean;
}

function validateResponse(response: Response): void {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("Response body is null");
  }
}

function processSSELine(
  line: string,
  parseEventFn: (data: string) => StreamEvent | null,
  callbacks: StreamCallbacks
): LineProcessResult {
  if (!line.startsWith("data: ")) {
    return { shouldBreak: false };
  }

  const data = line.slice(6);

  if (data === "[DONE]") {
    callbacks.setStatus("complete");
    callbacks.onComplete?.();
    return { shouldBreak: true };
  }

  const event = parseEventFn(data);
  if (!event) {
    return { shouldBreak: false };
  }

  callbacks.setEvents((prev) => [...prev, event]);
  callbacks.onEvent?.(event);

  if (event.type === "done") {
    callbacks.setStatus("complete");
    callbacks.onComplete?.();
  }

  return { shouldBreak: false };
}

function processSSELines(
  lines: string[],
  parseEventFn: (data: string) => StreamEvent | null,
  callbacks: StreamCallbacks
): boolean {
  for (const line of lines) {
    const result = processSSELine(line, parseEventFn, callbacks);
    if (result.shouldBreak) {
      return true;
    }
  }
  return false;
}

async function readStreamChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  parseEventFn: (data: string) => StreamEvent | null,
  callbacks: StreamCallbacks
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    const shouldStop = processSSELines(lines, parseEventFn, callbacks);
    if (shouldStop) {
      break;
    }
  }
}

function handleStreamError(
  err: unknown,
  setStatus: (status: StreamStatus) => void,
  setError: (error: Error | null) => void,
  onError?: (error: Error) => void
): void {
  if (err instanceof Error && err.name === "AbortError") {
    setStatus("idle");
    return;
  }

  const caughtError = err instanceof Error ? err : new Error(String(err));
  setError(caughtError);
  setStatus("error");
  onError?.(caughtError);
}

function useAgentStream(options: UseAgentStreamOptions): UseAgentStreamReturn {
  const {
    url,
    method = "POST",
    headers,
    onEvent,
    onError,
    onComplete,
    parseEvent,
  } = options;

  const [status, setStatus] = useState<StreamStatus>("idle");
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const defaultParseEvent = useCallback((data: string): StreamEvent | null => {
    try {
      return JSON.parse(data) as StreamEvent;
    } catch {
      return null;
    }
  }, []);

  const parseEventFn = parseEvent ?? defaultParseEvent;

  const start = useCallback(
    async (body?: unknown) => {
      if (status === "streaming") {
        return;
      }

      abortControllerRef.current = new AbortController();
      setStatus("connecting");
      setError(null);
      setEvents([]);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: abortControllerRef.current.signal,
        });

        validateResponse(response);
        setStatus("streaming");

        const callbacks: StreamCallbacks = {
          onEvent,
          onComplete,
          setStatus,
          setEvents,
        };

        const responseBody = response.body;
        if (!responseBody) {
          throw new Error("Response body is null");
        }

        await readStreamChunks(
          responseBody.getReader(),
          parseEventFn,
          callbacks
        );

        if (status !== "complete") {
          setStatus("complete");
          onComplete?.();
        }
      } catch (err) {
        handleStreamError(err, setStatus, setError, onError);
      }
    },
    [url, method, headers, status, parseEventFn, onEvent, onComplete, onError]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus("idle");
  }, []);

  const reset = useCallback(() => {
    stop();
    setEvents([]);
    setError(null);
  }, [stop]);

  return {
    status,
    events,
    error,
    start,
    stop,
    reset,
  };
}

export { useAgentStream };
export type {
  DoneEvent,
  ErrorEvent,
  StatusEvent,
  StreamEvent,
  StreamEventType,
  StreamStatus,
  TextEvent,
  ThinkingEvent,
  ToolCallEvent,
  ToolResultEvent,
  UseAgentStreamOptions,
  UseAgentStreamReturn,
};
