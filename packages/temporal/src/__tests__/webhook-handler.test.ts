import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { webhookHandlerWorkflow } from "../workflows/webhooks/webhook-handler";
import {
  createMockVespaActivities,
  createMockWebhookActivities,
} from "./setup";

describe("webhookHandlerWorkflow", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const activities = {
      ...createMockWebhookActivities(),
      ...createMockVespaActivities(),
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: "test-webhook",
      workflowsPath: require.resolve("../workflows/webhooks/webhook-handler"),
      activities,
    });

    worker.run();
  });

  afterAll(async () => {
    worker?.shutdown();
    await env?.teardown();
  });

  it("processes create event", async () => {
    const result = await env.client.workflow.execute(webhookHandlerWorkflow, {
      taskQueue: "test-webhook",
      workflowId: "test-webhook-create",
      args: [
        {
          connectorId: "conn_123",
          connectorType: "github",
          eventId: "evt_001",
          eventType: "document.created",
          payload: { documentId: "doc_123", title: "New Doc" },
          signature: "sha256=abc123",
          receivedAt: Date.now(),
        },
      ],
    });

    expect(result.processed).toBe(true);
    expect(result.success).toBe(true);
  });

  it("processes update event", async () => {
    const result = await env.client.workflow.execute(webhookHandlerWorkflow, {
      taskQueue: "test-webhook",
      workflowId: "test-webhook-update",
      args: [
        {
          connectorId: "conn_123",
          connectorType: "github",
          eventId: "evt_002",
          eventType: "document.updated",
          payload: { documentId: "doc_123", changes: { title: "Updated" } },
          signature: "sha256=abc123",
          receivedAt: Date.now(),
        },
      ],
    });

    expect(result.processed).toBe(true);
  });

  it("processes delete event", async () => {
    const result = await env.client.workflow.execute(webhookHandlerWorkflow, {
      taskQueue: "test-webhook",
      workflowId: "test-webhook-delete",
      args: [
        {
          connectorId: "conn_123",
          connectorType: "github",
          eventId: "evt_003",
          eventType: "document.deleted",
          payload: { documentId: "doc_123" },
          signature: "sha256=abc123",
          receivedAt: Date.now(),
        },
      ],
    });

    expect(result.processed).toBe(true);
  });

  it("handles connector revocation", async () => {
    const result = await env.client.workflow.execute(webhookHandlerWorkflow, {
      taskQueue: "test-webhook",
      workflowId: "test-webhook-revoke",
      args: [
        {
          connectorId: "conn_123",
          connectorType: "github",
          eventId: "evt_004",
          eventType: "connector.revoked",
          payload: {},
          signature: "sha256=abc123",
          receivedAt: Date.now(),
        },
      ],
    });

    expect(result.processed).toBe(true);
  });

  it("validates webhook signature", async () => {
    const result = await env.client.workflow.execute(webhookHandlerWorkflow, {
      taskQueue: "test-webhook",
      workflowId: "test-webhook-sig",
      args: [
        {
          connectorId: "conn_123",
          connectorType: "linear",
          eventId: "evt_005",
          eventType: "issue.created",
          payload: { issueId: "issue_123" },
          signature: "sha256=valid_signature",
          receivedAt: Date.now(),
        },
      ],
    });

    expect(result.processed).toBe(true);
  });
});
