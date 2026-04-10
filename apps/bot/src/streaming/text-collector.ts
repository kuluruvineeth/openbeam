interface StreamChunk {
  type: string;
  content?: string;
}

interface CollectorOptions {
  flushIntervalMs?: number;
  minCharsToFlush?: number;
}

interface CollectorResult {
  fullText: string;
  chunkCount: number;
}

type FlushCallback = (accumulated: string) => Promise<void>;

export async function collectAndFlush(
  stream: AsyncIterable<StreamChunk>,
  onFlush: FlushCallback,
  options: CollectorOptions = {}
): Promise<CollectorResult> {
  const interval = options.flushIntervalMs ?? 1000;
  const minChars = options.minCharsToFlush ?? 50;

  let accumulated = "";
  let lastFlush = Date.now();
  let pendingChars = 0;
  let chunkCount = 0;

  for await (const chunk of stream) {
    if (chunk.type === "text" && chunk.content) {
      accumulated += chunk.content;
      pendingChars += chunk.content.length;
      chunkCount += 1;
    }

    if (chunk.type === "done") {
      break;
    }

    const elapsed = Date.now() - lastFlush;
    if (elapsed >= interval && pendingChars >= minChars) {
      await onFlush(accumulated);
      pendingChars = 0;
      lastFlush = Date.now();
    }
  }

  if (accumulated.length > 0) {
    await onFlush(accumulated);
  }

  return { fullText: accumulated, chunkCount };
}
