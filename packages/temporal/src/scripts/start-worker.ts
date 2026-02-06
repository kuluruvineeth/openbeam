import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import prisma, { type Database } from "@openplane/db";
import {
  S3StorageProvider,
  type StorageConfig,
  type StorageProvider,
} from "@openplane/storage";
import { type VespaClient, vespaClient } from "@openplane/vespa";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as analyticsActivities from "../activities/analytics";
import { createCanvasExecutionActivities } from "../activities/canvas";
import {
  createBaseConnectorActivities,
  createUnifiedSyncActivities,
  registerAllSyncFactories,
} from "../activities/connectors";
import {
  createCleanupActivities,
  createDatabaseActivities,
} from "../activities/database";
import * as emergenceActivities from "../activities/emergence";
import { createEngineActivities } from "../activities/engine";
import * as entitiesActivities from "../activities/entities";
import * as ltrActivities from "../activities/ltr";
import * as personalizationActivities from "../activities/personalization";
import * as reembedActivities from "../activities/reembed";
import * as slackActivities from "../activities/slack";
import { createStorageActivities } from "../activities/storage";
import { createVespaActivities } from "../activities/vespa";
import { TASK_QUEUES } from "../config";
import type { WorkerType } from "../worker/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WorkerDependencies {
  db: Database;
  storage: StorageProvider;
  vespa: VespaClient;
  tempDir: string;
}

function loadStorageConfig(): StorageConfig {
  return {
    bucket: process.env.GCS_BUCKET ?? "openplane-files",
    region: process.env.GCS_REGION ?? "us-central1",
    endpoint: process.env.GCS_ENDPOINT,
    publicEndpoint: process.env.GCS_PUBLIC_ENDPOINT,
    accessKeyId: process.env.GCS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY ?? "",
  };
}

function createWorkerDependencies(): WorkerDependencies {
  return {
    db: prisma,
    storage: new S3StorageProvider(loadStorageConfig()),
    vespa: vespaClient,
    tempDir: process.env.TEMP_DIR ?? "/tmp/temporal-worker",
  };
}

export interface StartWorkerOptions {
  workerType: WorkerType;
  taskQueue?: string;
  maxConcurrentActivities?: number;
  maxConcurrentWorkflows?: number;
  temporalAddress?: string;
  namespace?: string;
}

const DEFAULT_OPTIONS = {
  maxConcurrentActivities: 10,
  maxConcurrentWorkflows: 100,
  temporalAddress: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
};

const SYNC_TASK_QUEUES = [
  TASK_QUEUES.SYNC_GMAIL,
  TASK_QUEUES.SYNC_GOOGLE_DRIVE,
  TASK_QUEUES.SYNC_SLACK,
  TASK_QUEUES.SYNC_LINEAR,
  TASK_QUEUES.SYNC_NOTION,
  TASK_QUEUES.DEFAULT,
];

export function getTaskQueuesForWorkerType(workerType: WorkerType): string[] {
  if (workerType === "sync") {
    return SYNC_TASK_QUEUES;
  }

  const mapping: Record<WorkerType, string> = {
    sync: TASK_QUEUES.SYNC_GMAIL,
    file: TASK_QUEUES.FILE_PROCESSING,
    media: TASK_QUEUES.MEDIA_PROCESSING,
    webhook: TASK_QUEUES.WEBHOOKS,
    agent: TASK_QUEUES.AGENTS,
    canvas: TASK_QUEUES.CANVAS,
    maintenance: TASK_QUEUES.MAINTENANCE,
    scheduled: TASK_QUEUES.SCHEDULED,
    knowledge: TASK_QUEUES.KNOWLEDGE,
  };

  return [mapping[workerType] ?? TASK_QUEUES.DEFAULT];
}

function getTaskQueueForWorkerType(workerType: WorkerType): string {
  const mapping: Record<WorkerType, string> = {
    sync: TASK_QUEUES.DEFAULT,
    file: TASK_QUEUES.FILE_PROCESSING,
    media: TASK_QUEUES.MEDIA_PROCESSING,
    webhook: TASK_QUEUES.WEBHOOKS,
    agent: TASK_QUEUES.AGENTS,
    canvas: TASK_QUEUES.CANVAS,
    maintenance: TASK_QUEUES.MAINTENANCE,
    scheduled: TASK_QUEUES.SCHEDULED,
    knowledge: TASK_QUEUES.KNOWLEDGE,
  };

  return mapping[workerType] ?? TASK_QUEUES.DEFAULT;
}

export async function startWorker(
  options: StartWorkerOptions
): Promise<Worker> {
  const {
    workerType,
    taskQueue,
    maxConcurrentActivities,
    maxConcurrentWorkflows,
    temporalAddress,
    namespace,
  } = { ...DEFAULT_OPTIONS, ...options };

  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  const finalTaskQueue = taskQueue ?? getTaskQueueForWorkerType(workerType);

  const deps = createWorkerDependencies();

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: finalTaskQueue,
    workflowsPath: join(__dirname, "../workflows"),
    activities: loadActivitiesForWorkerType(workerType, deps),
    maxConcurrentActivityTaskExecutions: maxConcurrentActivities,
    maxConcurrentWorkflowTaskExecutions: maxConcurrentWorkflows,
  });

  return worker;
}

function loadActivitiesForWorkerType(
  workerType: WorkerType,
  deps: WorkerDependencies
): Record<string, unknown> {
  const baseActivities = {
    ...createDatabaseActivities({ db: deps.db }),
    ...createStorageActivities({
      storage: deps.storage,
      tempDir: deps.tempDir,
    }),
  };

  const engineActivities = createEngineActivities({});

  switch (workerType) {
    case "sync": {
      registerAllSyncFactories();

      return {
        ...baseActivities,
        ...createBaseConnectorActivities({ db: deps.db }),
        ...createUnifiedSyncActivities({ db: deps.db }),
        ...createVespaActivities({ vespa: deps.vespa }),
        ...engineActivities,
      };
    }

    case "file":
    case "media":
      return {
        ...baseActivities,
        ...engineActivities,
      };

    case "scheduled":
      return {
        ...baseActivities,
        ...createCleanupActivities({ db: deps.db }),
        ...createVespaActivities({ vespa: deps.vespa }),
        ...engineActivities,
        ...reembedActivities,
        ...emergenceActivities,
        ...analyticsActivities,
        ...ltrActivities,
        ...entitiesActivities,
        ...personalizationActivities,
        ...slackActivities,
      };

    case "maintenance":
      return {
        ...baseActivities,
        ...createCleanupActivities({ db: deps.db }),
        ...createVespaActivities({ vespa: deps.vespa }),
      };

    case "canvas":
      return {
        ...baseActivities,
        ...createCanvasExecutionActivities({ db: deps.db }),
      };

    default:
      return baseActivities;
  }
}

export async function runWorker(options: StartWorkerOptions): Promise<void> {
  const worker = await startWorker(options);

  const shutdown = () => {
    worker.shutdown();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await worker.run();
}
