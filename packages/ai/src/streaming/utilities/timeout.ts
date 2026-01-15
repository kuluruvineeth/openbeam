export class StreamTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "StreamTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export interface TimeoutOptions {
  timeoutMs: number;
  onTimeout?: () => void;
  errorMessage?: string;
}

export async function* withTimeout<T>(
  source: AsyncGenerator<T>,
  options: TimeoutOptions
): AsyncGenerator<T> {
  const { timeoutMs, onTimeout, errorMessage } = options;
  const iterator = source[Symbol.asyncIterator]();
  const timeoutMessage =
    errorMessage ?? `Stream timed out after ${timeoutMs}ms`;

  while (true) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        onTimeout?.();
        reject(new StreamTimeoutError(timeoutMessage, timeoutMs));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([iterator.next(), timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (result.done) {
        break;
      }
      yield result.value;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof StreamTimeoutError && iterator.return) {
        await iterator.return(undefined);
      }
      throw error;
    }
  }
}

export function withIdleTimeout<T>(
  source: AsyncGenerator<T>,
  idleTimeoutMs: number,
  errorMessage?: string
): AsyncGenerator<T> {
  return withTimeout(source, {
    timeoutMs: idleTimeoutMs,
    errorMessage:
      errorMessage ?? `Stream idle timeout after ${idleTimeoutMs}ms`,
  });
}

export async function* withAbort<T>(
  source: AsyncGenerator<T>,
  signal: AbortSignal
): AsyncGenerator<T> {
  const abortPromise = new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(new Error("Aborted"));
    }
    signal.addEventListener("abort", () => reject(new Error("Aborted")));
  });

  const iterator = source[Symbol.asyncIterator]();

  while (true) {
    const result = await Promise.race([iterator.next(), abortPromise]);

    if (result.done) {
      break;
    }

    yield result.value;
  }
}

export async function collectWithTimeout<T>(
  source: AsyncGenerator<T>,
  timeoutMs: number
): Promise<T[]> {
  const results: T[] = [];

  for await (const chunk of withTimeout(source, { timeoutMs })) {
    results.push(chunk);
  }

  return results;
}
