import type { Database } from "@openbeam/db";
import type { Worker } from "@temporalio/worker";
import {
  type AgentExecutor,
  createAgentActivities,
  createControlPlaneActivities,
} from "../activities";
import { TASK_QUEUES } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface AgentWorkerDependencies {
  db: Database;
  executor: AgentExecutor;
}

export function createAgentWorker(
  deps: AgentWorkerDependencies
): Promise<Worker> {
  const agentActivities = createAgentActivities({
    db: deps.db,
    executor: deps.executor,
  });
  const controlActivities = createControlPlaneActivities({ db: deps.db });

  const options: WorkerOptions = {
    taskQueue: TASK_QUEUES.AGENTS,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: { ...agentActivities, ...controlActivities } as Record<
      string,
      unknown
    >,
    maxConcurrentActivityTaskExecutions: 10,
  };

  return createWorker(options);
}
