import { afterEach, describe, expect, it } from "vitest";
import { loadMissionWorkerConfig } from "../config/index";
import { TASK_QUEUES } from "../config/task-queues";

describe("loadMissionWorkerConfig", () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("returns defaults when no env vars set", () => {
    process.env.TEMPORAL_MISSION_TASK_QUEUE = undefined;
    process.env.TEMPORAL_MAX_ACTIVITIES = undefined;
    process.env.TEMPORAL_MAX_WORKFLOWS = undefined;
    process.env.TEMPORAL_MAX_CACHED = undefined;

    const config = loadMissionWorkerConfig();

    expect(config.taskQueue).toBe(TASK_QUEUES.MISSION);
    expect(config.maxConcurrentActivityTaskExecutions).toBe(10);
    expect(config.maxConcurrentWorkflowTaskExecutions).toBe(100);
    expect(config.maxCachedWorkflows).toBe(500);
  });

  it("reads TEMPORAL_MAX_ACTIVITIES from env", () => {
    process.env.TEMPORAL_MAX_ACTIVITIES = "50";

    const config = loadMissionWorkerConfig();

    expect(config.maxConcurrentActivityTaskExecutions).toBe(50);
  });

  it("reads TEMPORAL_MAX_WORKFLOWS from env", () => {
    process.env.TEMPORAL_MAX_WORKFLOWS = "200";

    const config = loadMissionWorkerConfig();

    expect(config.maxConcurrentWorkflowTaskExecutions).toBe(200);
  });

  it("reads TEMPORAL_MAX_CACHED from env", () => {
    process.env.TEMPORAL_MAX_CACHED = "1000";

    const config = loadMissionWorkerConfig();

    expect(config.maxCachedWorkflows).toBe(1000);
  });

  it("uses TASK_QUEUES.MISSION as default taskQueue", () => {
    process.env.TEMPORAL_MISSION_TASK_QUEUE = undefined;

    const config = loadMissionWorkerConfig();

    expect(config.taskQueue).toBe(TASK_QUEUES.MISSION);
  });

  it("reads TEMPORAL_MISSION_TASK_QUEUE from env", () => {
    process.env.TEMPORAL_MISSION_TASK_QUEUE = "custom-mission-queue";

    const config = loadMissionWorkerConfig();

    expect(config.taskQueue).toBe("custom-mission-queue");
  });

  it("rejects NaN from invalid env var values", () => {
    process.env.TEMPORAL_MAX_ACTIVITIES = "not-a-number";

    expect(() => loadMissionWorkerConfig()).toThrow();
  });
});
