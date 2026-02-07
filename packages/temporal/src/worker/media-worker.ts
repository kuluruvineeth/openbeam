import type { TwelveLabsClient } from "@openplane/media";
import type { StorageProvider } from "@openplane/storage";
import type { VespaClient } from "@openplane/vespa";
import type { Worker } from "@temporalio/worker";
import {
  createMediaActivities,
  createStorageActivities,
  createVespaActivities,
} from "../activities";
import { TASK_QUEUES } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface MediaWorkerDependencies {
  storage: StorageProvider;
  twelvelabs: TwelveLabsClient;
  twelvelabsIndexId: string;
  vespa: VespaClient;
}

export function createMediaWorker(
  deps: MediaWorkerDependencies
): Promise<Worker> {
  const storageActivities = createStorageActivities({
    storage: deps.storage,
  });

  const mediaActivities = createMediaActivities({
    twelvelabs: deps.twelvelabs,
    indexId: deps.twelvelabsIndexId,
  });

  const vespaActivities = createVespaActivities({
    vespa: deps.vespa,
  });

  const options: WorkerOptions = {
    taskQueue: TASK_QUEUES.MEDIA_PROCESSING,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: {
      ...storageActivities,
      ...mediaActivities,
      ...vespaActivities,
    } as Record<string, unknown>,
    maxConcurrentActivityTaskExecutions: 5,
  };

  return createWorker(options);
}
