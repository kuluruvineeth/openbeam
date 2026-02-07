import type { StreamChunk, TokenUsage } from "@openplane/types/ai";

export function createSSEStream(
  chunks: AsyncIterable<StreamChunk>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorChunk: StreamChunk = { type: "error", error: errorMessage };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
        );
        controller.close();
      }
    },
  });
}

export function createDataStream(
  generator: () => AsyncGenerator<StreamChunk>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator()) {
          switch (chunk.type) {
            case "text":
              controller.enqueue(
                encoder.encode(`0:${JSON.stringify(chunk.content)}\n`)
              );
              break;
            case "tool-call":
              controller.enqueue(
                encoder.encode(`9:${JSON.stringify(chunk.toolCall)}\n`)
              );
              break;
            case "done":
              controller.enqueue(
                encoder.encode(
                  `d:${JSON.stringify({
                    finishReason: "stop",
                    usage: chunk.usage,
                  })}\n`
                )
              );
              break;
            case "error":
              controller.enqueue(
                encoder.encode(`3:${JSON.stringify(chunk.error)}\n`)
              );
              break;
            default:
              break;
          }
        }
        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`3:${JSON.stringify(errorMessage)}\n`)
        );
        controller.close();
      }
    },
  });
}

export function createTextPart(content: string): StreamChunk {
  return { type: "text", content };
}

export function createFinishPart(
  content: string,
  usage?: Partial<TokenUsage>
): StreamChunk {
  return { type: "done", content, usage };
}

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<StreamChunk> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            return;
          }
          try {
            yield JSON.parse(data) as StreamChunk;
            // biome-ignore lint/suspicious/noEmptyBlockStatements: skip malformed chunks
          } catch {}
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function collectStream(
  chunks: AsyncIterable<StreamChunk>
): Promise<{
  content: string;
  usage?: Partial<TokenUsage>;
}> {
  let content = "";
  let usage: Partial<TokenUsage> | undefined;

  for await (const chunk of chunks) {
    if (chunk.type === "text") {
      content += chunk.content;
    } else if (chunk.type === "done") {
      usage = chunk.usage;
    }
  }

  return { content, usage };
}
