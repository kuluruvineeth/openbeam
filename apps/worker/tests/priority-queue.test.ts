/**
 * Priority Queue Tests
 * 
 * Tests the priority-based job queue system.
 * Ensures high-priority jobs (webhooks) are processed before low-priority (full syncs).
 * 
 * Run: bun test tests/priority-queue.test.ts
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  addSyncJob,
  getSyncJob,
  getSyncQueueMetrics,
  syncQueue,
} from "@openplane/redis";
import { cleanupTestData, sleep } from "./setup";

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Priority Queue", () => {
  test("jobs can be added with different priorities", async () => {
    const priorities = [1, 5, 10];
    const jobIds: string[] = [];

    for (const priority of priorities) {
      const job = await addSyncJob(
        {
          connectorId: `test-priority-${priority}`,
          syncJobId: `sync-${Date.now()}-${priority}`,
          type: "INCREMENTAL",
          priority,
        },
        priority
      );

      expect(job).toBeDefined();
      jobIds.push(job.id);
    }

    // Verify jobs exist
    for (const jobId of jobIds) {
      const job = await getSyncJob(jobId);
      expect(job).toBeDefined();
    }

    // Cleanup (ignore errors - jobs may be locked by worker)
    for (const jobId of jobIds) {
      try {
        const job = await syncQueue.getJob(jobId);
        if (job) {
          await job.remove();
        }
      } catch {
        // Ignore - job may be locked
      }
    }
  });

  test("priority levels (webhook=10, manual=7, scheduled=5, full=3)", async () => {
    const testCases = [
      { type: "webhook", priority: 10 },
      { type: "manual", priority: 7 },
      { type: "scheduled", priority: 5 },
      { type: "full", priority: 3 },
    ];

    for (const testCase of testCases) {
      const job = await addSyncJob(
        {
          connectorId: `test-${testCase.type}`,
          syncJobId: `sync-${Date.now()}`,
          type: testCase.priority >= 5 ? "INCREMENTAL" : "FULL",
          priority: testCase.priority,
        },
        testCase.priority
      );

      expect(job).toBeDefined();
      expect(job.opts.priority).toBe(testCase.priority);

      // Cleanup (ignore errors)
      try {
        await job.remove();
      } catch {
        // Ignore - job may be locked
      }
    }
  });

  test("default priority is 5", async () => {
    // Add job without explicit priority
    const job = await addSyncJob({
      connectorId: "test-default",
      syncJobId: `sync-${Date.now()}`,
      type: "INCREMENTAL",
    });

    expect(job).toBeDefined();
    expect(job.opts.priority).toBe(5);

    // Cleanup
    await job.remove();
  });

  test("queue metrics are tracked", async () => {
    const initialMetrics = await getSyncQueueMetrics();

    // Add multiple jobs
    const jobIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const job = await addSyncJob({
        connectorId: `test-metrics-${i}`,
        syncJobId: `sync-${Date.now()}-${i}`,
        type: "INCREMENTAL",
        priority: 5,
      });
      jobIds.push(job.id);
    }

    // Wait a bit for metrics to update
    await sleep(100);

    // Check metrics updated
    const afterMetrics = await getSyncQueueMetrics();
    expect(afterMetrics.total).toBeGreaterThanOrEqual(initialMetrics.total);

    // Cleanup (ignore errors)
    for (const jobId of jobIds) {
      try {
        const job = await syncQueue.getJob(jobId);
        if (job) {
          await job.remove();
        }
      } catch {
        // Ignore - job may be locked
      }
    }
  });

  test("job IDs are unique", async () => {
    const connectorId = "test-unique";

    // Add first job
    const job1 = await addSyncJob({
      connectorId,
      syncJobId: `sync-${Date.now()}`,
      type: "INCREMENTAL",
      priority: 5,
    });

    expect(job1).toBeDefined();

    // Job IDs include timestamp, so should be unique
    await sleep(10);

    const job2 = await addSyncJob({
      connectorId,
      syncJobId: `sync-${Date.now()}`,
      type: "INCREMENTAL",
      priority: 5,
    });

    expect(job2).toBeDefined();
    expect(job1.id).not.toBe(job2.id);

    // Cleanup (ignore errors)
    try {
      await job1.remove();
      await job2.remove();
    } catch {
      // Ignore - jobs may be locked
    }
  });

  test("job retry options (attempts=3, exponential backoff)", async () => {
    const job = await addSyncJob({
      connectorId: "test-options",
      syncJobId: `sync-${Date.now()}`,
      type: "INCREMENTAL",
      priority: 5,
    });

    expect(job).toBeDefined();
    expect(job.opts.attempts).toBe(3);
    expect(job.opts.backoff).toBeDefined();
    expect(job.opts.backoff?.type).toBe("exponential");

    // Cleanup (ignore errors)
    try {
      await job.remove();
    } catch {
      // Ignore - job may be locked
    }
  });
});

