/**
 * Streaming Utilities
 *
 * Helpers for working with streaming completions.
 */

import type { StreamChunk, ToolCall } from "./types";

/**
 * Create a ReadableStream from completion chunks
 */
export function createTextStream(
  chunks: AsyncIterable<string>
): ReadableStream<string> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Create a Server-Sent Events stream from completion chunks
 */
export function createSSEStream(
  chunks: AsyncIterable<StreamChunk>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const errorChunk: StreamChunk = {
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
        );
        controller.close();
      }
    },
  });
}

/**
 * Parse SSE stream into chunks
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<StreamChunk> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete messages
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            return;
          }
          try {
            yield JSON.parse(data) as StreamChunk;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Collect streaming text into a single string
 */
export async function collectStreamText(
  stream: AsyncIterable<string>
): Promise<string> {
  let result = "";
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

/**
 * Transform streaming text chunks to include tool call detection
 */
export async function* detectToolCalls(
  chunks: AsyncIterable<string>
): AsyncIterable<
  { type: "text"; content: string } | { type: "tool_call"; toolCall: ToolCall }
> {
  let buffer = "";

  for await (const chunk of chunks) {
    buffer += chunk;
    yield { type: "text", content: chunk };
  }

  // After streaming complete, check for tool call patterns
  // This is a fallback - actual tool calls should come from the API
}

/**
 * Rate-limited stream transformer
 */
export async function* rateLimit<T>(
  source: AsyncIterable<T>,
  delayMs: number
): AsyncIterable<T> {
  for await (const item of source) {
    yield item;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Chunk text stream by token count (approximate)
 */
export async function* chunkByTokens(
  stream: AsyncIterable<string>,
  maxTokensPerChunk = 100
): AsyncIterable<string> {
  let buffer = "";
  const charsPerToken = 4; // Rough approximation

  for await (const chunk of stream) {
    buffer += chunk;

    while (buffer.length >= maxTokensPerChunk * charsPerToken) {
      const splitPoint = maxTokensPerChunk * charsPerToken;
      yield buffer.slice(0, splitPoint);
      buffer = buffer.slice(splitPoint);
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}

/**
 * Create a tee of a stream (fork into two streams)
 */
export function teeStream<T>(
  source: AsyncIterable<T>
): [AsyncIterable<T>, AsyncIterable<T>] {
  const buffer: T[] = [];
  let done = false;
  let error: Error | null = null;
  const readers: Array<{
    index: number;
    resolve: (value: IteratorResult<T>) => void;
  }> = [];

  // Start consuming source
  (async () => {
    try {
      for await (const item of source) {
        buffer.push(item);
        // Wake up any waiting readers
        for (const reader of readers) {
          if (reader.index < buffer.length) {
            reader.resolve({ value: buffer[reader.index], done: false });
            reader.index++;
          }
        }
      }
      done = true;
      for (const reader of readers) {
        reader.resolve({ value: undefined as T, done: true });
      }
    } catch (e) {
      error = e as Error;
      for (const reader of readers) {
        reader.resolve({ value: undefined as T, done: true });
      }
    }
  })();

  function createReader(): AsyncIterable<T> {
    let index = 0;

    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<T>> {
            if (error) throw error;
            if (index < buffer.length) {
              return { value: buffer[index++], done: false };
            }
            if (done) {
              return { value: undefined as T, done: true };
            }
            // Wait for next item
            return new Promise((resolve) => {
              readers.push({ index: index++, resolve });
            });
          },
        };
      },
    };
  }

  return [createReader(), createReader()];
}
