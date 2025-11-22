/**
 * Adaptive Batch Sizing Tests
 *
 * Tests dynamic batch size calculation based on performance metrics.
 *
 * Run: bun test tests/batch-sizer.test.ts
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AppType } from "@openplane/db";
import {
  BatchSizeTracker,
  batchSizeTracker,
  calculateBatchSize,
} from "../src/utils/batch-sizer";
import { cleanupTestData } from "./setup";

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Adaptive Batch Sizing", () => {
  test("calculate batch size for different connector types", () => {
    const slackBatchSize = calculateBatchSize("SLACK" as AppType);
    const notionBatchSize = calculateBatchSize("NOTION" as AppType);
    const driveBatchSize = calculateBatchSize("GOOGLE_DRIVE" as AppType);

    expect(slackBatchSize).toBe(200); // Slack default
    expect(notionBatchSize).toBe(100); // Notion default
    expect(driveBatchSize).toBe(50); // Google Drive default
  });

  test("adjust batch size for large documents", () => {
    const normalBatchSize = calculateBatchSize(
      "SLACK" as AppType,
      undefined,
      10
    ); // 10KB avg
    const largeBatchSize = calculateBatchSize(
      "SLACK" as AppType,
      undefined,
      150
    ); // 150KB avg

    expect(largeBatchSize).toBeLessThan(normalBatchSize);
  });

  test("adjust batch size for small documents", () => {
    const normalBatchSize = calculateBatchSize(
      "SLACK" as AppType,
      undefined,
      10
    ); // 10KB avg
    const smallBatchSize = calculateBatchSize("SLACK" as AppType, undefined, 5); // 5KB avg

    expect(smallBatchSize).toBeGreaterThan(normalBatchSize);
  });

  test("adjust batch size for slow response times", () => {
    const normalBatchSize = calculateBatchSize("SLACK" as AppType);
    const slowBatchSize = calculateBatchSize("SLACK" as AppType, {
      avgResponseTimeMs: 6000, // 6 seconds (slow)
      errorRate: 0,
      lastBatchSize: 200,
    });

    expect(slowBatchSize).toBeLessThan(normalBatchSize);
  });

  test("adjust batch size for fast response times", () => {
    const normalBatchSize = calculateBatchSize("SLACK" as AppType);
    const fastBatchSize = calculateBatchSize("SLACK" as AppType, {
      avgResponseTimeMs: 500, // 0.5 seconds (fast)
      errorRate: 0,
      lastBatchSize: 200,
    });

    expect(fastBatchSize).toBeGreaterThan(normalBatchSize);
  });

  test("adjust batch size for high error rate", () => {
    const normalBatchSize = calculateBatchSize("SLACK" as AppType);
    const highErrorBatchSize = calculateBatchSize("SLACK" as AppType, {
      avgResponseTimeMs: 1000,
      errorRate: 0.15, // 15% error rate
      lastBatchSize: 200,
    });

    expect(highErrorBatchSize).toBeLessThan(normalBatchSize);
  });

  test("batch size stays within min/max bounds", () => {
    const veryLargeDocs = calculateBatchSize(
      "SLACK" as AppType,
      undefined,
      500
    ); // 500KB avg
    const veryHighErrors = calculateBatchSize("SLACK" as AppType, {
      avgResponseTimeMs: 10_000,
      errorRate: 0.5,
      lastBatchSize: 200,
    });

    expect(veryLargeDocs).toBeGreaterThanOrEqual(10); // MIN_BATCH_SIZE
    expect(veryHighErrors).toBeGreaterThanOrEqual(10);

    const verySmallDocs = calculateBatchSize("SLACK" as AppType, undefined, 1); // 1KB avg
    expect(verySmallDocs).toBeLessThanOrEqual(500); // MAX_BATCH_SIZE
  });

  test("batch size tracker records metrics", () => {
    const tracker = new BatchSizeTracker();
    const connectorId = "test-connector";

    tracker.recordBatch(connectorId, 100, 1000, 5);

    const metrics = tracker.getMetrics(connectorId);
    expect(metrics).toBeDefined();
    expect(metrics?.avgResponseTimeMs).toBe(1000);
    expect(metrics?.errorRate).toBe(0.05); // 5/100
    expect(metrics?.lastBatchSize).toBe(100);
  });

  test("batch size tracker updates with exponential moving average", () => {
    const tracker = new BatchSizeTracker();
    const connectorId = "test-connector";

    tracker.recordBatch(connectorId, 100, 1000, 0);
    tracker.recordBatch(connectorId, 100, 2000, 0);

    const metrics = tracker.getMetrics(connectorId);
    expect(metrics?.avgResponseTimeMs).toBeGreaterThan(1000);
    expect(metrics?.avgResponseTimeMs).toBeLessThan(2000);
  });

  test("batch size tracker resets metrics", () => {
    const tracker = new BatchSizeTracker();
    const connectorId = "test-connector";

    tracker.recordBatch(connectorId, 100, 1000, 0);
    expect(tracker.getMetrics(connectorId)).toBeDefined();

    tracker.reset(connectorId);
    expect(tracker.getMetrics(connectorId)).toBeUndefined();
  });

  test("global batch size tracker is accessible", () => {
    const connectorId = "test-global";
    batchSizeTracker.recordBatch(connectorId, 100, 1000, 0);

    const metrics = batchSizeTracker.getMetrics(connectorId);
    expect(metrics).toBeDefined();

    batchSizeTracker.reset(connectorId);
  });
});
