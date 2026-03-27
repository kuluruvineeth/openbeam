import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { completionService, embeddingService } from "@openbeam/ai";
import { toolRegistry } from "@openbeam/ai/tools";
import prisma, { type Database } from "@openbeam/db";
import { createToolServices } from "@openbeam/services";
import {
  S3StorageProvider,
  type StorageConfig,
  type StorageProvider,
} from "@openbeam/storage";
import { type VespaClient, vespaClient } from "@openbeam/vespa";
import { NativeConnection, Worker } from "@temporalio/worker";
import {
  createAgentActivities,
  createControlPlaneActivities,
  LlmAgentExecutor,
} from "../activities/agents";
import * as analyticsActivities from "../activities/analytics";
import { createCanvasExecutionActivities } from "../activities/canvas";
import {
  createBaseConnectorActivities,
  createConnectorFileActivities,
  createUnifiedSyncActivities,
  registerAllSyncFactories,
} from "../activities/connectors";
import { createContextEnrichmentActivities } from "../activities/context";
import {
  createCleanupActivities,
  createDatabaseActivities,
} from "../activities/database";
import * as emergenceActivities from "../activities/emergence";
import { createEngineActivities } from "../activities/engine";
import * as entitiesActivities from "../activities/entities";
import {
  createKnowledgeChangeActivities,
  createKnowledgeCleanupActivities,
  createKnowledgeInferenceActivities,
} from "../activities/knowledge";
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
    bucket: process.env.GCS_BUCKET ?? "openbeam-files",
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
    context: TASK_QUEUES.CONTEXT_ENRICHMENT,
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
    context: TASK_QUEUES.CONTEXT_ENRICHMENT,
  };

  return mapping[workerType] ?? TASK_QUEUES.DEFAULT;
}

export async function startWorker(
  options: StartWorkerOptions
): Promise<Worker> {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const { workerType, taskQueue, temporalAddress, namespace } = merged;

  const maxConcurrentActivities =
    merged.maxConcurrentActivities ?? DEFAULT_OPTIONS.maxConcurrentActivities;
  const maxConcurrentWorkflows =
    merged.maxConcurrentWorkflows ?? DEFAULT_OPTIONS.maxConcurrentWorkflows;

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
    activities: await loadActivitiesForWorkerType(workerType, deps),
    maxConcurrentActivityTaskExecutions: maxConcurrentActivities,
    maxConcurrentWorkflowTaskExecutions: maxConcurrentWorkflows,
  });

  return worker;
}

async function loadActivitiesForWorkerType(
  workerType: WorkerType,
  deps: WorkerDependencies
): Promise<Record<string, unknown>> {
  toolRegistry.bindServices(createToolServices());

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
        ...createConnectorFileActivities({ tempDir: deps.tempDir }),
        ...createVespaActivities({ vespa: deps.vespa }),
        ...engineActivities,
      };

    case "scheduled":
      return {
        ...baseActivities,
        ...createCleanupActivities({ db: deps.db }),
        ...createKnowledgeCleanupActivities({ db: deps.db }),
        ...createKnowledgeInferenceActivities({ db: deps.db }),
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

    case "agent": {
      const { registerAdapter } = await import(
        "@openbeam/services/control/adapters/registry"
      );
      const { httpAdapter } = await import(
        "@openbeam/services/control/adapters/http/index"
      );
      const { processAdapter } = await import(
        "@openbeam/services/control/adapters/process/index"
      );
      const { claudeLocalAdapter } = await import(
        "@openbeam/services/control/adapters/claude-local/index"
      );
      const { codexLocalAdapter } = await import(
        "@openbeam/services/control/adapters/codex-local/index"
      );
      registerAdapter(httpAdapter);
      registerAdapter(processAdapter);
      registerAdapter(claudeLocalAdapter);
      registerAdapter(codexLocalAdapter);

      return {
        ...baseActivities,
        ...createAgentActivities({
          db: deps.db,
          executor: new LlmAgentExecutor(),
        }),
        ...createControlPlaneActivities({ db: deps.db }),
      };
    }

    case "canvas":
      return {
        ...baseActivities,
        ...createCanvasExecutionActivities({ db: deps.db }),
      };

    case "knowledge":
      return {
        ...baseActivities,
        ...createKnowledgeChangeActivities({
          db: deps.db,
          vespa: deps.vespa,
          engineBaseUrl: process.env.ENGINE_URL ?? "http://localhost:8000",
        }),
        ...createKnowledgeInferenceActivities({ db: deps.db }),
        ...createKnowledgeCleanupActivities({ db: deps.db }),
      };

    case "context":
      return {
        ...baseActivities,
        ...createContextEnrichmentActivities({
          db: deps.db,
          completionService,
          embeddingService,
          vespaClient: deps.vespa,
        }),
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
