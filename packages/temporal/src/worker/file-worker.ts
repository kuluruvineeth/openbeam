import type { StorageProvider } from "@openplane/storage";
import type { VespaClient } from "@openplane/vespa";
import type { Worker } from "@temporalio/worker";
import {
  createEngineActivities,
  createStorageActivities,
  createVespaActivities,
} from "../activities";
import { TASK_QUEUES } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface FileWorkerDependencies {
  storage: StorageProvider;
  vespa: VespaClient;
  cpuServiceUrl?: string;
  gpuServiceUrl?: string;
}

export function createFileWorker(
  deps: FileWorkerDependencies
): Promise<Worker> {
  const storageActivities = createStorageActivities({
    storage: deps.storage,
  });

  const engineActivities = createEngineActivities({
    cpuServiceUrl: deps.cpuServiceUrl,
    gpuServiceUrl: deps.gpuServiceUrl,
  });

  const vespaActivities = createVespaActivities({
    vespa: deps.vespa,
  });

  const options: WorkerOptions = {
    taskQueue: TASK_QUEUES.FILE_PROCESSING,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: {
      ...storageActivities,
      ...engineActivities,
      ...vespaActivities,
    } as Record<string, unknown>,
    maxConcurrentActivityTaskExecutions: 20,
  };

  return createWorker(options);
}
