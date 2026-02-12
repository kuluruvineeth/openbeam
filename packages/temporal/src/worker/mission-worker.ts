import type { Database } from "@openplane/db";
import type { Worker } from "@temporalio/worker";
import {
  type AgentExecutor,
  createAgentActivities,
} from "../activities/agents";
import {
  createMissionActivities,
  createMissionTimelinePublisher,
} from "../activities/mission";
import { TASK_QUEUES } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface MissionWorkerDependencies {
  db: Database;
  executor: AgentExecutor;
}

export function createMissionWorker(
  deps: MissionWorkerDependencies
): Promise<Worker> {
  const missionActivities = createMissionActivities({
    db: deps.db,
    publishTimelineEvent: createMissionTimelinePublisher(deps.db),
  });
  const agentActivities = createAgentActivities({
    db: deps.db,
    executor: deps.executor,
  });

  const options: WorkerOptions = {
    taskQueue: TASK_QUEUES.MISSION,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: {
      ...missionActivities,
      ...agentActivities,
    } as Record<string, unknown>,
    maxConcurrentActivityTaskExecutions: 10,
  };

  return createWorker(options);
}
