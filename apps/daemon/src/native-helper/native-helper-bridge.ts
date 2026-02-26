import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import readline from "node:readline";
import type { Logger } from "pino";
import {
  type NativeHelperEvent,
  NativeHelperEventSchema,
  type NativeHelperMethodParams,
  type NativeHelperMethodResult,
  NativeHelperMethodSchemas,
  type NativeHelperRpcMethod,
  NativeHelperRpcRequestSchema,
  NativeHelperRpcResponseSchema,
} from "./protocol.js";

type PendingCall = {
  method: NativeHelperRpcMethod;
  timeoutHandle: ReturnType<typeof setTimeout>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type SpawnProcess = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
) => ChildProcessWithoutNullStreams;

export class NativeHelperUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NativeHelperUnavailableError";
  }
}

export class NativeHelperTimeoutError extends Error {
  constructor(
    message: string,
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    public readonly method: NativeHelperRpcMethod,
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    public readonly requestId: string,
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = "NativeHelperTimeoutError";
  }
}

export class NativeHelperRpcError extends Error {
  // biome-ignore lint/nursery/useMaxParams: callback signature
  constructor(
    message: string,
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    public readonly method: NativeHelperRpcMethod,
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    public readonly requestId: string,
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    public readonly code: number,
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    public readonly data: unknown
  ) {
    super(message);
    this.name = "NativeHelperRpcError";
  }
}

export class NativeHelperResponseValidationError extends Error {
  constructor(
    message: string,
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    public readonly method: NativeHelperRpcMethod,
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    public readonly requestId: string,
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    public readonly validationError: string
  ) {
    super(message);
    this.name = "NativeHelperResponseValidationError";
  }
}

export type NativeHelperBridge = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
  setEventHandler: (
    handler: ((event: NativeHelperEvent) => void) | null
  ) => void;
  call: <M extends NativeHelperRpcMethod>(
    method: M,
    params: NativeHelperMethodParams<M>,
    options?: {
      timeoutMs?: number;
    }
  ) => Promise<NativeHelperMethodResult<M>>;
};

function normalizeTimeoutMs(
  value: number | undefined,
  fallback: number
): number {
  if (!Number.isFinite(value) || typeof value !== "number") {
    return fallback;
  }
  const rounded = Math.floor(value);
  if (rounded <= 0) {
    return fallback;
  }
  return rounded;
}

export function createNativeHelperBridge(params: {
  logger: Logger;
  command: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  defaultTimeoutMs?: number;
  onEvent?: (event: NativeHelperEvent) => void;
  spawnProcess?: SpawnProcess;
}): NativeHelperBridge {
  const logger = params.logger.child({ module: "native-helper-bridge" });
  const pendingCalls = new Map<string, PendingCall>();
  const commandArgs = params.args ?? [];
  const processEnv = params.env ?? process.env;
  const defaultTimeoutMs = normalizeTimeoutMs(params.defaultTimeoutMs, 5000);
  const spawnProcess: SpawnProcess =
    params.spawnProcess ??
    ((command, args, env) =>
      spawn(command, args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
      }));

  let processHandle: ChildProcessWithoutNullStreams | null = null;
  let stdoutReader: readline.Interface | null = null;
  let stderrReader: readline.Interface | null = null;
  let startingPromise: Promise<void> | null = null;
  let stopping = false;
  let eventHandler: ((event: NativeHelperEvent) => void) | null =
    params.onEvent ?? null;

  const clearPendingCall = (requestId: string): PendingCall | null => {
    const pending = pendingCalls.get(requestId);
    if (!pending) {
      return null;
    }
    clearTimeout(pending.timeoutHandle);
    pendingCalls.delete(requestId);
    return pending;
  };

  const rejectAllPendingCalls = (error: Error): void => {
    for (const pending of pendingCalls.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(error);
    }
    pendingCalls.clear();
  };

  const cleanupReaders = (): void => {
    stdoutReader?.removeAllListeners();
    stderrReader?.removeAllListeners();
    stdoutReader?.close();
    stderrReader?.close();
    stdoutReader = null;
    stderrReader = null;
  };

  const onHelperExit = (
    exitCode: number | null,
    signal: NodeJS.Signals | null
  ): void => {
    const wasStopping = stopping;
    cleanupReaders();
    processHandle = null;

    if (wasStopping) {
      return;
    }

    const error = new NativeHelperUnavailableError(
      `Native helper exited unexpectedly (code: ${exitCode}, signal: ${signal})`
    );
    rejectAllPendingCalls(error);
    logger.warn({ exitCode, signal }, "Native helper exited unexpectedly");
  };

  const handleResponse = (response: unknown): void => {
    const parsedResponse = NativeHelperRpcResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      logger.warn(
        { error: parsedResponse.error.message, response },
        "Discarding invalid native helper response envelope"
      );
      return;
    }

    const pending = clearPendingCall(parsedResponse.data.id);
    if (!pending) {
      logger.debug(
        { requestId: parsedResponse.data.id },
        "Discarding native helper response with unknown request id"
      );
      return;
    }

    if (parsedResponse.data.error) {
      pending.reject(
        new NativeHelperRpcError(
          `Native helper returned RPC error for ${pending.method}: ${parsedResponse.data.error.message}`,
          pending.method,
          parsedResponse.data.id,
          parsedResponse.data.error.code,
          parsedResponse.data.error.data
        )
      );
      return;
    }

    const resultSchema = NativeHelperMethodSchemas[pending.method].result;
    const parsedResult = resultSchema.safeParse(parsedResponse.data.result);
    if (!parsedResult.success) {
      pending.reject(
        new NativeHelperResponseValidationError(
          `Native helper returned invalid result payload for ${pending.method}`,
          pending.method,
          parsedResponse.data.id,
          parsedResult.error.message
        )
      );
      return;
    }

    pending.resolve(parsedResult.data);
  };

  const handleEvent = (event: unknown): boolean => {
    const parsedEvent = NativeHelperEventSchema.safeParse(event);
    if (!parsedEvent.success) {
      return false;
    }

    if (eventHandler) {
      try {
        eventHandler(parsedEvent.data);
      } catch (error) {
        logger.warn({ err: error }, "Native helper event handler threw");
      }
    }

    return true;
  };

  const handleStdoutLine = (line: string): void => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(trimmed);
    } catch (error) {
      logger.warn(
        { err: error, line: trimmed },
        "Failed to parse native helper stdout line as JSON"
      );
      return;
    }

    if (handleEvent(payload)) {
      return;
    }

    handleResponse(payload);
  };

  const start = async (): Promise<void> => {
    if (processHandle) {
      return;
    }

    if (startingPromise) {
      return startingPromise;
    }

    startingPromise = (async () => {
      const child = spawnProcess(params.command, commandArgs, processEnv);

      await new Promise<void>((resolve, reject) => {
        const onSpawn = () => {
          child.off("error", onError);
          resolve();
        };
        const onError = (error: Error) => {
          child.off("spawn", onSpawn);
          reject(error);
        };

        child.once("spawn", onSpawn);
        child.once("error", onError);
      });

      processHandle = child;
      stopping = false;

      stdoutReader = readline.createInterface({
        input: child.stdout,
        crlfDelay: Number.POSITIVE_INFINITY,
      });
      stderrReader = readline.createInterface({
        input: child.stderr,
        crlfDelay: Number.POSITIVE_INFINITY,
      });

      stdoutReader.on("line", handleStdoutLine);
      stderrReader.on("line", (line) => {
        if (line.trim().length === 0) {
          return;
        }
        logger.debug({ line }, "Native helper stderr");
      });

      child.on("exit", onHelperExit);
      child.on("error", (error) => {
        const wrappedError = new NativeHelperUnavailableError(
          `Native helper process error: ${error.message}`
        );
        rejectAllPendingCalls(wrappedError);
        logger.error({ err: error }, "Native helper process emitted error");
      });

      logger.info(
        { command: params.command, args: commandArgs },
        "Native helper bridge started"
      );
    })();

    try {
      await startingPromise;
    } finally {
      startingPromise = null;
    }
  };

  const stop = async (): Promise<void> => {
    if (startingPromise) {
      await startingPromise;
    }

    const child = processHandle;
    if (!child) {
      return;
    }

    stopping = true;
    cleanupReaders();
    rejectAllPendingCalls(
      new NativeHelperUnavailableError("Native helper bridge stopped")
    );

    await new Promise<void>((resolve) => {
      let settled = false;
      const finalize = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };

      const timeoutHandle = setTimeout(() => {
        finalize();
      }, 1000);

      child.once("exit", () => {
        clearTimeout(timeoutHandle);
        finalize();
      });

      try {
        child.kill();
      } catch {
        clearTimeout(timeoutHandle);
        finalize();
      }
    });

    processHandle = null;
    logger.info("Native helper bridge stopped");
  };

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  const call = async <M extends NativeHelperRpcMethod>(
    method: M,
    paramsForMethod: NativeHelperMethodParams<M>,
    options?: {
      timeoutMs?: number;
    }
  ): Promise<NativeHelperMethodResult<M>> => {
    const child = processHandle;
    if (!child?.stdin.writable) {
      throw new NativeHelperUnavailableError(
        "Native helper is not running or stdin is not writable"
      );
    }

    const parsedParams =
      NativeHelperMethodSchemas[method].params.parse(paramsForMethod);
    const requestId = randomUUID();
    const requestEnvelope = NativeHelperRpcRequestSchema.parse({
      id: requestId,
      method,
      params: parsedParams,
    });
    const timeoutMs = normalizeTimeoutMs(options?.timeoutMs, defaultTimeoutMs);

    return new Promise<NativeHelperMethodResult<M>>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        const pending = clearPendingCall(requestId);
        if (!pending) {
          return;
        }

        pending.reject(
          new NativeHelperTimeoutError(
            `Native helper call "${method}" timed out after ${timeoutMs}ms`,
            method,
            requestId,
            timeoutMs
          )
        );
      }, timeoutMs);

      pendingCalls.set(requestId, {
        method,
        timeoutHandle,
        resolve: resolve as unknown as (value: unknown) => void,
        reject: reject as unknown as (error: Error) => void,
      });

      const payload = `${JSON.stringify(requestEnvelope)}\n`;
      child.stdin.write(payload, (error) => {
        if (!error) {
          return;
        }
        const pending = clearPendingCall(requestId);
        if (!pending) {
          return;
        }
        pending.reject(
          new NativeHelperUnavailableError(
            `Failed to write native helper request for ${method}: ${error.message}`
          )
        );
      });
    });
  };

  const isRunning = (): boolean =>
    processHandle !== null && !processHandle.killed;

  const setEventHandler = (
    handler: ((event: NativeHelperEvent) => void) | null
  ): void => {
    eventHandler = handler;
  };

  return {
    start,
    stop,
    isRunning,
    setEventHandler,
    call,
  };
}
