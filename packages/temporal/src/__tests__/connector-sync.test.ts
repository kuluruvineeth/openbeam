import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { connectorSyncWorkflow } from "../workflows/sync/connector-sync";
import {
  cancelSignal,
  pauseSignal,
  progressQuery,
  resumeSignal,
} from "../workflows/types";
import {
  createMockDatabaseActivities,
  createMockSyncActivities,
  createMockVespaActivities,
} from "./setup";

describe("connectorSyncWorkflow", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const activities = {
      ...createMockSyncActivities(),
      ...createMockDatabaseActivities(),
      ...createMockVespaActivities(),
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: "test-sync",
      workflowsPath: require.resolve("../workflows/sync/connector-sync"),
      activities,
    });

    worker.run();
  });

  afterAll(async () => {
    worker?.shutdown();
    await env?.teardown();
  });

  it("completes sync successfully with single batch", async () => {
    const result = await env.client.workflow.execute(connectorSyncWorkflow, {
      taskQueue: "test-sync",
      workflowId: "test-sync-1",
      args: [
        {
          connectorId: "conn_123",
          syncHistoryId: "history_1",
          syncType: "FULL",
          trigger: "MANUAL",
        },
      ],
    });

    expect(result.processed).toBeGreaterThan(0);
    expect(result.errors).toBe(0);
    expect(result.duration).toBeGreaterThan(0);
  });

  it("handles pause and resume signals", async () => {
    const handle = await env.client.workflow.start(connectorSyncWorkflow, {
      taskQueue: "test-sync",
      workflowId: "test-sync-pause",
      args: [
        {
          connectorId: "conn_123",
          syncHistoryId: "history_pause",
          syncType: "FULL",
          trigger: "MANUAL",
        },
      ],
    });

    await handle.signal(pauseSignal);

    const stateAfterPause = await handle.query(progressQuery);
    expect(stateAfterPause.isPaused).toBe(true);

    await handle.signal(resumeSignal);

    const result = await handle.result();
    expect(result.processed).toBeGreaterThan(0);
  });

  it("handles cancel signal", async () => {
    const handle = await env.client.workflow.start(connectorSyncWorkflow, {
      taskQueue: "test-sync",
      workflowId: "test-sync-cancel",
      args: [
        {
          connectorId: "conn_123",
          syncHistoryId: "history_cancel",
          syncType: "FULL",
          trigger: "MANUAL",
        },
      ],
    });

    await handle.signal(cancelSignal);

    const result = await handle.result();
    expect(result).toBeDefined();
  });

  it("tracks progress via query", async () => {
    const handle = await env.client.workflow.start(connectorSyncWorkflow, {
      taskQueue: "test-sync",
      workflowId: "test-sync-progress",
      args: [
        {
          connectorId: "conn_123",
          syncHistoryId: "history_progress",
          syncType: "FULL",
          trigger: "MANUAL",
        },
      ],
    });

    const state = await handle.query(progressQuery);

    expect(state.stage).toBeDefined();
    expect(typeof state.processed).toBe("number");
    expect(typeof state.indexed).toBe("number");
    expect(typeof state.errors).toBe("number");
  });

  it("resumes from cursor for incremental sync", async () => {
    const result = await env.client.workflow.execute(connectorSyncWorkflow, {
      taskQueue: "test-sync",
      workflowId: "test-sync-incremental",
      args: [
        {
          connectorId: "conn_123",
          syncHistoryId: "history_incremental",
          syncType: "INCREMENTAL",
          trigger: "SCHEDULE",
          cursor: { page: 5 },
        },
      ],
    });

    expect(result.finalCursor).toBeDefined();
  });
});
