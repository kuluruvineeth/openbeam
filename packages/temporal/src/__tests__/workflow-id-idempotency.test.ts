import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowIdReusePolicy,
} from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { generateWorkflowId } from "../utils/workflow-id";
import { connectorSyncWorkflow } from "../workflows/sync/connector-sync";
import { createAllMockActivities } from "./setup";

const TIMESTAMP_REGEX = /:\d+$/;

describe("Workflow ID Idempotency", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createLocal();

    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: "test-idempotency",
      workflowsPath: require.resolve("../workflows/sync/connector-sync"),
      activities: createAllMockActivities(),
    });

    await worker.runUntil(async () => {
      // Worker is ready
    });
  });

  afterAll(async () => {
    await worker?.shutdown();
    await env?.teardown();
  });

  it("prevents concurrent syncs for same connector with deterministic workflow ID", async () => {
    const connectorId = "conn_test_123";

    const workflowId = generateWorkflowId({
      type: "sync",
      connectorId,
    });

    expect(workflowId).toBe(`sync:${connectorId}`);
    expect(workflowId).not.toMatch(TIMESTAMP_REGEX);

    const { client } = env;

    const firstHandle = await client.workflow.start(connectorSyncWorkflow, {
      taskQueue: "test-idempotency",
      workflowId,
      args: [
        {
          connectorId,
          syncHistoryId: "history_1",
          syncType: "FULL",
          trigger: "MANUAL",
        },
      ],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });

    expect(firstHandle.workflowId).toBe(workflowId);

    try {
      await client.workflow.start(connectorSyncWorkflow, {
        taskQueue: "test-idempotency",
        workflowId,
        args: [
          {
            connectorId,
            syncHistoryId: "history_2",
            syncType: "INCREMENTAL",
            trigger: "SCHEDULE",
          },
        ],
        workflowIdReusePolicy:
          WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
      });

      throw new Error(
        "Should have thrown WorkflowExecutionAlreadyStartedError"
      );
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowExecutionAlreadyStartedError);
      if (error instanceof Error) {
        expect(error.message).toContain("already started");
      }
    }

    const handle = client.workflow.getHandle(workflowId);
    const description = await handle.describe();
    expect(description.workflowId).toBe(workflowId);

    await firstHandle.result();
  });

  it("allows new sync after previous completes with ALLOW_DUPLICATE_FAILED_ONLY policy", async () => {
    const connectorId = "conn_test_456";
    const workflowId = generateWorkflowId({
      type: "sync",
      connectorId,
    });

    const { client } = env;

    const firstResult = await client.workflow.execute(connectorSyncWorkflow, {
      taskQueue: "test-idempotency",
      workflowId,
      args: [
        {
          connectorId,
          syncHistoryId: "history_1",
          syncType: "FULL",
          trigger: "MANUAL",
        },
      ],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
    });

    expect(firstResult.processed).toBeGreaterThan(0);

    try {
      await client.workflow.start(connectorSyncWorkflow, {
        taskQueue: "test-idempotency",
        workflowId,
        args: [
          {
            connectorId,
            syncHistoryId: "history_2",
            syncType: "INCREMENTAL",
            trigger: "SCHEDULE",
          },
        ],
        workflowIdReusePolicy:
          WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      });

      throw new Error(
        "Should have thrown WorkflowExecutionAlreadyStartedError"
      );
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowExecutionAlreadyStartedError);
    }
  });

  it("different connectors get different workflow IDs", async () => {
    const connectorId1 = "conn_abc";
    const connectorId2 = "conn_xyz";

    const workflowId1 = generateWorkflowId({
      type: "sync",
      connectorId: connectorId1,
    });
    const workflowId2 = generateWorkflowId({
      type: "sync",
      connectorId: connectorId2,
    });

    expect(workflowId1).toBe(`sync:${connectorId1}`);
    expect(workflowId2).toBe(`sync:${connectorId2}`);
    expect(workflowId1).not.toBe(workflowId2);

    const { client } = env;

    const [result1, result2] = await Promise.all([
      client.workflow.execute(connectorSyncWorkflow, {
        taskQueue: "test-idempotency",
        workflowId: workflowId1,
        args: [
          {
            connectorId: connectorId1,
            syncHistoryId: "history_1",
            syncType: "FULL",
            trigger: "MANUAL",
          },
        ],
      }),
      client.workflow.execute(connectorSyncWorkflow, {
        taskQueue: "test-idempotency",
        workflowId: workflowId2,
        args: [
          {
            connectorId: connectorId2,
            syncHistoryId: "history_2",
            syncType: "FULL",
            trigger: "MANUAL",
          },
        ],
      }),
    ]);

    expect(result1.processed).toBeGreaterThan(0);
    expect(result2.processed).toBeGreaterThan(0);
  });

  it("workflow ID generation is deterministic for same connector", () => {
    const connectorId = "conn_deterministic";

    const id1 = generateWorkflowId({ type: "sync", connectorId });
    const id2 = generateWorkflowId({ type: "sync", connectorId });
    const id3 = generateWorkflowId({ type: "sync", connectorId });

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
    expect(id1).toBe(`sync:${connectorId}`);
  });
});
