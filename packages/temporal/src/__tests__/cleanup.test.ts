import { fileURLToPath } from "node:url";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupWorkflow } from "../workflows/scheduled/cleanup";
import {
  createMockDatabaseActivities,
  createMockStorageActivities,
  createMockVespaActivities,
} from "./setup";

describe("cleanupWorkflow", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const activities = {
      ...createMockDatabaseActivities(),
      ...createMockVespaActivities(),
      ...createMockStorageActivities(),
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: "test-cleanup",
      workflowsPath: fileURLToPath(
        new URL("../workflows/scheduled/cleanup.ts", import.meta.url)
      ),
      activities,
    });

    worker.run();
  });

  afterAll(async () => {
    await worker?.shutdown();
    await env?.teardown();
  });

  it("runs daily cleanup", async () => {
    const result = await env.client.workflow.execute(cleanupWorkflow, {
      taskQueue: "test-cleanup",
      workflowId: "test-cleanup-1",
      args: [{ type: "DAILY" }],
    });

    expect(result).toBeDefined();
    expect(typeof result.staleDeleted).toBe("number");
    expect(typeof result.orphansRemoved).toBe("number");
  });

  it("cleans up for specific team", async () => {
    const result = await env.client.workflow.execute(cleanupWorkflow, {
      taskQueue: "test-cleanup",
      workflowId: "test-cleanup-team",
      args: [{ type: "DELETION_SYNC", teamId: "team_123" }],
    });

    expect(result).toBeDefined();
  });

  it("handles deletion sync type", async () => {
    const result = await env.client.workflow.execute(cleanupWorkflow, {
      taskQueue: "test-cleanup",
      workflowId: "test-cleanup-deletion",
      args: [{ type: "DELETION_SYNC" }],
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
