import type { Database } from "@openbeam/db";
import type { VespaClient } from "@openbeam/vespa";
import type { Worker } from "@temporalio/worker";
import { createWebhookActivities } from "../activities";
import { TASK_QUEUES } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface WebhookWorkerDependencies {
  db: Database;
  vespa: VespaClient;
}

export function createWebhookWorker(
  deps: WebhookWorkerDependencies
): Promise<Worker> {
  const webhookActivities = createWebhookActivities({
    db: deps.db,
    vespa: deps.vespa,
  });

  const options: WorkerOptions = {
    taskQueue: TASK_QUEUES.WEBHOOKS,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: { ...webhookActivities } as Record<string, unknown>,
    maxConcurrentActivityTaskExecutions: 100,
  };

  return createWorker(options);
}
