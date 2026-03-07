import type { Database } from "@openbeam/db";
import type { StorageProvider } from "@openbeam/storage";
import type { VespaClient } from "@openbeam/vespa";
import type { Worker } from "@temporalio/worker";
import {
  type ConnectorSyncActivities,
  createBaseConnectorActivities,
  createDatabaseActivities,
  createEngineActivities,
  createStorageActivities,
  createVespaActivities,
} from "../activities";
import { TASK_QUEUES, type TaskQueue } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface SyncWorkerDependencies {
  db: Database;
  vespa: VespaClient;
  storage: StorageProvider;
  cpuServiceUrl?: string;
  gpuServiceUrl?: string;
}

export interface SyncWorkerConfig {
  connectorType: string;
  syncActivities: ConnectorSyncActivities;
}

export function createSyncWorker(
  config: SyncWorkerConfig,
  deps: SyncWorkerDependencies
): Promise<Worker> {
  const baseConnectorActivities = createBaseConnectorActivities({
    db: deps.db,
  });

  const databaseActivities = createDatabaseActivities({
    db: deps.db,
  });

  const vespaActivities = createVespaActivities({
    vespa: deps.vespa,
  });

  const storageActivities = createStorageActivities({
    storage: deps.storage,
  });

  const engineActivities = createEngineActivities({
    cpuServiceUrl: deps.cpuServiceUrl,
    gpuServiceUrl: deps.gpuServiceUrl,
  });

  const taskQueue =
    (TASK_QUEUES[
      `SYNC_${config.connectorType.toUpperCase().replace("-", "_")}` as keyof typeof TASK_QUEUES
    ] as TaskQueue) ?? TASK_QUEUES.DEFAULT;

  const options: WorkerOptions = {
    taskQueue,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: {
      ...baseConnectorActivities,
      ...config.syncActivities,
      ...databaseActivities,
      ...vespaActivities,
      ...storageActivities,
      ...engineActivities,
    } as Record<string, unknown>,
    maxConcurrentActivityTaskExecutions: 50,
  };

  return createWorker(options);
}
