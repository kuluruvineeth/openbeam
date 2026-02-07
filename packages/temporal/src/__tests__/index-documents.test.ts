import { fileURLToPath } from "node:url";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { indexDocumentsWorkflow } from "../workflows/processing/index-documents";
import {
  createMockDatabaseActivities,
  createMockEngineActivities,
  createMockVespaActivities,
} from "./setup";

describe("indexDocumentsWorkflow", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const activities = {
      ...createMockDatabaseActivities(),
      ...createMockEngineActivities(),
      ...createMockVespaActivities(),
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: "test-index",
      workflowsPath: fileURLToPath(
        new URL("../workflows/processing/index-documents.ts", import.meta.url)
      ),
      activities,
    });

    worker.run();
  });

  afterAll(async () => {
    await worker?.shutdown();
    await env?.teardown();
  });

  it("indexes documents successfully", async () => {
    const result = await env.client.workflow.execute(indexDocumentsWorkflow, {
      taskQueue: "test-index",
      workflowId: "test-index-1",
      args: [
        {
          connectorId: "conn_123",
          documents: [
            { id: "doc1", title: "Doc 1", content: "content" },
            { id: "doc2", title: "Doc 2", content: "content" },
          ],
        },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.indexed).toBe(2);
    expect(result.errors).toBe(0);
    expect(result.success).toBe(true);
  });

  it("handles empty document array", async () => {
    const result = await env.client.workflow.execute(indexDocumentsWorkflow, {
      taskQueue: "test-index",
      workflowId: "test-index-empty",
      args: [
        {
          connectorId: "conn_123",
          documents: [],
        },
      ],
    });

    expect(result.total).toBe(0);
    expect(result.indexed).toBe(0);
    expect(result.success).toBe(true);
  });

  it("batches large document sets", async () => {
    const documents = Array.from({ length: 250 }, (_, i) => ({
      id: `doc_${i}`,
      title: `Document ${i}`,
      content: "test content",
    }));

    const result = await env.client.workflow.execute(indexDocumentsWorkflow, {
      taskQueue: "test-index",
      workflowId: "test-index-batch",
      args: [
        {
          connectorId: "conn_123",
          documents,
          batchSize: 100,
        },
      ],
    });

    expect(result.total).toBe(250);
    expect(result.indexed).toBe(250);
  });

  it("deduplicates before indexing", async () => {
    const result = await env.client.workflow.execute(indexDocumentsWorkflow, {
      taskQueue: "test-index",
      workflowId: "test-index-dedup",
      args: [
        {
          connectorId: "conn_123",
          documents: [
            { id: "doc1", checksum: "abc123" },
            { id: "doc2", checksum: "abc123" },
          ],
        },
      ],
    });

    expect(result.total).toBe(2);
  });
});
