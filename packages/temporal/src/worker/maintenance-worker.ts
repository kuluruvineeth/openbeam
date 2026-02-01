import type { Database } from "@openplane/db";
import type { StorageProvider } from "@openplane/storage";
import type { VespaClient } from "@openplane/vespa";
import type { Worker } from "@temporalio/worker";
import {
  createCleanupActivities,
  createStorageActivities,
  createVespaActivities,
} from "../activities";
import { TASK_QUEUES } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface MaintenanceWorkerDependencies {
  db: Database;
  vespa: VespaClient;
  storage: StorageProvider;
}

export function createMaintenanceWorker(
  deps: MaintenanceWorkerDependencies
): Promise<Worker> {
  const cleanupActivities = createCleanupActivities({
    db: deps.db,
  });

  const vespaActivities = createVespaActivities({
    vespa: deps.vespa,
  });

  const storageActivities = createStorageActivities({
    storage: deps.storage,
  });

  const options: WorkerOptions = {
    taskQueue: TASK_QUEUES.MAINTENANCE,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: {
      ...cleanupActivities,
      ...vespaActivities,
      ...storageActivities,
    } as Record<string, unknown>,
    maxConcurrentActivityTaskExecutions: 10,
  };

  return createWorker(options);
}
