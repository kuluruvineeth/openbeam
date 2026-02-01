import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { fileProcessingWorkflow } from "../workflows/processing/file-processing";
import {
  createMockEngineActivities,
  createMockStorageActivities,
  createMockVespaActivities,
} from "./setup";

describe("fileProcessingWorkflow", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const activities = {
      ...createMockEngineActivities(),
      ...createMockStorageActivities(),
      ...createMockVespaActivities(),
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: "test-file",
      workflowsPath: require.resolve("../workflows/processing/file-processing"),
      activities,
    });

    worker.run();
  });

  afterAll(async () => {
    worker?.shutdown();
    await env?.teardown();
  });

  it("processes file through full pipeline", async () => {
    const result = await env.client.workflow.execute(fileProcessingWorkflow, {
      taskQueue: "test-file",
      workflowId: "test-file-1",
      args: [
        {
          connectorId: "conn_123",
          externalId: "ext_123",
          mimeType: "application/pdf",
          downloadUrl: "https://example.com/file.pdf",
        },
      ],
    });

    expect(result.documentId).toBeDefined();
    expect(result.indexed).toBe(true);
    expect(result.chunks).toBeGreaterThan(0);
  });

  it("handles text files", async () => {
    const result = await env.client.workflow.execute(fileProcessingWorkflow, {
      taskQueue: "test-file",
      workflowId: "test-file-text",
      args: [
        {
          connectorId: "conn_123",
          externalId: "readme_123",
          mimeType: "text/plain",
          downloadUrl: "https://example.com/readme.txt",
        },
      ],
    });

    expect(result.indexed).toBe(true);
  });

  it("processes different mime types", async () => {
    const result = await env.client.workflow.execute(fileProcessingWorkflow, {
      taskQueue: "test-file",
      workflowId: "test-file-docx",
      args: [
        {
          connectorId: "conn_123",
          externalId: "doc_456",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          downloadUrl: "https://example.com/document.docx",
        },
      ],
    });

    expect(result.documentId).toBeDefined();
  });
});
