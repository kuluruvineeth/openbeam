import { readFile } from "node:fs/promises";
import {
  type ActivityInboundCallsInterceptor,
  NativeConnection,
  type WorkerOptions as TemporalWorkerOptions,
  Worker,
} from "@temporalio/worker";
import { loadTemporalConfig, type TemporalConfig } from "../config";
import { PIIRedactionCodec } from "../data-converter";
import { createActivityInboundInterceptor } from "../interceptors/activity-interceptors";

export interface WorkerOptions {
  taskQueue: string;
  workflowsPath: string;
  activities: Record<string, unknown>;
  maxConcurrentActivityTaskExecutions?: number;
  maxConcurrentWorkflowTaskExecutions?: number;
  maxCachedWorkflows?: number;
  buildId?: string;
  enableInterceptors?: boolean;
  interceptors?: {
    activityInbound?: ActivityInboundCallsInterceptor[];
  };
  shutdownGraceTimeMs?: number;
  stickyQueueScheduleToStartTimeoutMs?: number;
}

export interface WorkerHandle {
  worker: Worker;
  connection: NativeConnection;
  shutdown: () => Promise<void>;
  run: () => Promise<void>;
}

let sharedConnection: NativeConnection | null = null;
let connectionRefCount = 0;

async function createNativeConnection(
  config: TemporalConfig
): Promise<NativeConnection> {
  const tls =
    config.tls?.certPath && config.tls?.keyPath
      ? {
          clientCertPair: {
            crt: await readFile(config.tls.certPath),
            key: await readFile(config.tls.keyPath),
          },
          serverRootCACertificate: config.tls.caPath
            ? await readFile(config.tls.caPath)
            : undefined,
        }
      : undefined;

  return NativeConnection.connect({
    address: config.address,
    tls,
  });
}

async function getOrCreateConnection(
  config: TemporalConfig
): Promise<NativeConnection> {
  if (sharedConnection) {
    connectionRefCount += 1;
    return sharedConnection;
  }

  sharedConnection = await createNativeConnection(config);
  connectionRefCount = 1;
  return sharedConnection;
}

export async function releaseConnection(): Promise<void> {
  connectionRefCount -= 1;
  if (connectionRefCount <= 0 && sharedConnection) {
    await sharedConnection.close();
    sharedConnection = null;
    connectionRefCount = 0;
  }
}

function buildInterceptors(
  options: WorkerOptions
): TemporalWorkerOptions["interceptors"] {
  if (options.enableInterceptors === false) {
    return {};
  }

  return {
    activityInbound: [
      () =>
        createActivityInboundInterceptor({
          enableMetrics: true,
          enableLogging: process.env.NODE_ENV !== "production",
        }),
      ...(options.interceptors?.activityInbound?.map((i) => () => i) ?? []),
    ],
  };
}

async function buildDataConverter() {
  const codec = await PIIRedactionCodec.create(
    {
      keyId: process.env.TEMPORAL_ENCRYPTION_KEY_ID ?? "production-key-v1",
      rotationInterval: 7 * 24 * 60 * 60 * 1000,
    },
    {
      patterns: new Set<
        | "EMAIL"
        | "PHONE"
        | "SSN"
        | "CREDIT_CARD"
        | "API_KEY"
        | "AWS_ACCESS_KEY"
        | "IP_ADDRESS"
        | "US_PASSPORT"
      >([
        "EMAIL",
        "PHONE",
        "SSN",
        "CREDIT_CARD",
        "API_KEY",
        "AWS_ACCESS_KEY",
        "IP_ADDRESS",
        "US_PASSPORT",
      ]),
      sensitiveFields: new Set([
        "password",
        "apiKey",
        "accessToken",
        "refreshToken",
        "privateKey",
        "secret",
        "token",
        "credentials",
        "clientSecret",
        "bearerToken",
        "authToken",
        "sessionToken",
        "oauthToken",
      ]),
      strategy: "mask",
      maskChar: "*",
    }
  );

  return {
    payloadCodecs: [codec],
  };
}

async function buildWorkerOptions(
  connection: NativeConnection,
  config: TemporalConfig,
  options: WorkerOptions
): Promise<TemporalWorkerOptions> {
  const dataConverter = await buildDataConverter();

  return {
    connection,
    namespace: config.namespace,
    taskQueue: options.taskQueue,
    workflowsPath: options.workflowsPath,
    activities: options.activities,
    dataConverter,
    maxConcurrentActivityTaskExecutions:
      options.maxConcurrentActivityTaskExecutions ?? 100,
    maxConcurrentWorkflowTaskExecutions:
      options.maxConcurrentWorkflowTaskExecutions ?? 100,
    maxCachedWorkflows: options.maxCachedWorkflows ?? 1000,
    buildId: options.buildId ?? process.env.BUILD_ID,
    stickyQueueScheduleToStartTimeout:
      options.stickyQueueScheduleToStartTimeoutMs ?? 10_000,
    shutdownGraceTime: options.shutdownGraceTimeMs ?? 10_000,
    interceptors: buildInterceptors(options),
  };
}

export async function createWorker(options: WorkerOptions): Promise<Worker> {
  const config = loadTemporalConfig();
  const connection = await getOrCreateConnection(config);
  const workerOptions = await buildWorkerOptions(connection, config, options);

  return Worker.create(workerOptions);
}

export async function createWorkerWithHandle(
  options: WorkerOptions
): Promise<WorkerHandle> {
  const config = loadTemporalConfig();
  const connection = await createNativeConnection(config);
  const workerOptions = await buildWorkerOptions(connection, config, options);

  const worker = await Worker.create(workerOptions);

  let isShuttingDown = false;

  const shutdown = async (): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    console.log("[worker] Initiating graceful shutdown...");

    worker.shutdown();
    await connection.close();

    console.log("[worker] Shutdown complete");
  };

  const run = async (): Promise<void> => {
    const handleSignal = () => {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: shutdown errors during signal handling should be silently ignored
      shutdown().catch(() => {});
    };

    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);

    try {
      await worker.run();
    } finally {
      process.off("SIGINT", handleSignal);
      process.off("SIGTERM", handleSignal);
    }
  };

  return { worker, connection, shutdown, run };
}

export async function closeSharedConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.close();
    sharedConnection = null;
    connectionRefCount = 0;
  }
}
