import { fileURLToPath } from "node:url";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMockDatabaseActivities,
  createMockEngineActivities,
  createMockVespaActivities,
} from "./setup";

const TASK_QUEUE = "test-index";
const WORKFLOWS_PATH = fileURLToPath(
  new URL("../workflows/processing/index-documents.ts", import.meta.url)
);

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

describe("indexDocumentsWorkflow", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;
  let runPromise: Promise<void>;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const activities = {
      ...createMockDatabaseActivities(),
      ...createMockEngineActivities(),
      ...createMockVespaActivities(),
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: TASK_QUEUE,
      workflowsPath: WORKFLOWS_PATH,
      activities,
    });

    runPromise = worker.run();
  }, 180_000);

  afterAll(async () => {
    try {
      worker?.shutdown();
      await runPromise;
    } finally {
      await env?.teardown();
    }
  }, 180_000);

  async function executeIndexWorkflow(
    workflowId: string,
    input: {
      connectorId: string;
      documents: unknown[];
      batchSize?: number;
    }
  ) {
    const handle = await withTimeout(
      env.client.workflow.start("indexDocumentsWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId,
        workflowExecutionTimeout: "120s",
        workflowRunTimeout: "120s",
        workflowTaskTimeout: "60s",
        args: [input],
      }),
      10_000,
      "workflow start"
    );

    try {
      return await withTimeout(handle.result(), 90_000, "workflow result");
    } catch (error) {
      const description = await handle.describe();
      const status = description.status.name;
      const historyLength =
        description.raw.workflowExecutionInfo?.historyLength ?? 0;
      const history = await handle.fetchHistory();
      const lastEvents =
        history.events?.slice(-6).map((event) => ({
          type: event.eventType,
          activityFailed: event.activityTaskFailedEventAttributes,
          activityTimedOut: event.activityTaskTimedOutEventAttributes,
          workflowTaskFailed: event.workflowTaskFailedEventAttributes,
        })) ?? [];
      await handle.terminate("Timed out waiting for workflow result");

      const message =
        error instanceof Error
          ? error.message
          : "Unknown workflow result error";
      throw new Error(
        `${message} (status=${status}, historyLength=${historyLength}, lastEvents=${JSON.stringify(lastEvents)})`
      );
    }
  }

  it("indexes documents successfully", async () => {
    const result = await executeIndexWorkflow("test-index-1", {
      connectorId: "conn_123",
      documents: [
        {
          id: "doc1",
          external_id: "ext-doc1",
          title: "Doc 1",
          content: "content",
        },
        {
          id: "doc2",
          external_id: "ext-doc2",
          title: "Doc 2",
          content: "content",
        },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.indexed).toBe(2);
    expect(result.errors).toBe(0);
    expect(result.success).toBe(true);
  });

  it("handles empty document array", async () => {
    const result = await executeIndexWorkflow("test-index-empty", {
      connectorId: "conn_123",
      documents: [],
    });

    expect(result.total).toBe(0);
    expect(result.indexed).toBe(0);
    expect(result.success).toBe(true);
  });

  it("batches large document sets", async () => {
    const documents = Array.from({ length: 250 }, (_, i) => ({
      id: `doc_${i}`,
      external_id: `ext_doc_${i}`,
      title: `Document ${i}`,
      content: "test content",
    }));

    const result = await executeIndexWorkflow("test-index-batch", {
      connectorId: "conn_123",
      documents,
      batchSize: 100,
    });

    expect(result.total).toBe(250);
    expect(result.indexed).toBe(250);
  });

  it("deduplicates before indexing", async () => {
    const result = await executeIndexWorkflow("test-index-dedup", {
      connectorId: "conn_123",
      documents: [
        { id: "doc1", external_id: "doc1", checksum: "abc123" },
        { id: "doc2", external_id: "doc2", checksum: "abc123" },
      ],
    });

    expect(result.total).toBe(2);
  });

  it("handles deletion markers", async () => {
    const result = await executeIndexWorkflow("test-index-delete", {
      connectorId: "conn_123",
      documents: [
        {
          id: "conn_123_email_msg_1",
          external_id: "msg_1",
          metadata: { deleted: true },
        },
      ],
    });

    expect(result.indexed).toBe(0);
    expect(result.dataDeleted).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.success).toBe(true);
  });
});

describe("indexDocumentsWorkflow - document change tracking", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;
  let runPromise: Promise<void>;
  const recordedChanges: Array<{
    connectorId: string;
    documentIds: string[];
    changeType: string;
    syncHistoryId?: string;
  }> = [];

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const dbActivities = createMockDatabaseActivities();
    const activities = {
      ...dbActivities,
      ...createMockEngineActivities(),
      ...createMockVespaActivities(),
      recordSyncDocumentChanges: (input: {
        connectorId: string;
        documentIds: string[];
        changeType: string;
        syncHistoryId?: string;
      }) => {
        recordedChanges.push(input);
        return Promise.resolve({ recorded: input.documentIds.length });
      },
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: "test-index-changes",
      workflowsPath: WORKFLOWS_PATH,
      activities,
    });

    runPromise = worker.run();
  }, 180_000);

  afterAll(async () => {
    try {
      worker?.shutdown();
      await runPromise;
    } finally {
      await env?.teardown();
    }
  }, 180_000);

  it("records DELETED document changes after deletion", async () => {
    recordedChanges.length = 0;

    const handle = await withTimeout(
      env.client.workflow.start("indexDocumentsWorkflow", {
        taskQueue: "test-index-changes",
        workflowId: "test-delete-changes",
        workflowExecutionTimeout: "120s",
        workflowRunTimeout: "120s",
        workflowTaskTimeout: "60s",
        args: [
          {
            connectorId: "conn_456",
            documents: [
              {
                id: "vespa_doc_1",
                external_id: "ext_1",
                metadata: { deleted: true },
              },
              {
                id: "vespa_doc_2",
                external_id: "ext_2",
                metadata: { deleted: true },
              },
            ],
            syncHistoryId: "sync_hist_1",
          },
        ],
      }),
      10_000,
      "workflow start"
    );

    await withTimeout(handle.result(), 90_000, "workflow result");

    const deleteChange = recordedChanges.find(
      (c) => c.changeType === "DELETED"
    );
    expect(deleteChange).toBeDefined();
    expect(deleteChange?.connectorId).toBe("conn_456");
    expect(deleteChange?.documentIds).toEqual(
      expect.arrayContaining(["vespa_doc_1", "vespa_doc_2"])
    );
    expect(deleteChange?.syncHistoryId).toBe("sync_hist_1");
  });
});
