/**
 * Fencing Protocol Tests
 * 
 * Tests the exactly-once execution guarantee using Redis-based fencing.
 * Critical for preventing duplicate job execution in distributed systems.
 * 
 * Run: bun test tests/fencing.test.ts
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fence } from "@openplane/redis";
import { cleanupTestData, sleep } from "./setup";

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Fencing Protocol", () => {
  test("basic fence acquisition and validation", async () => {
    const connectorId = "test-connector-basic";

    // Acquire fence token
    const token = await fence.acquireFence(connectorId);
    expect(token).toBeGreaterThan(0);

    // Validate the acquired token
    const isValid = await fence.validateFence(connectorId, token);
    expect(isValid).toBe(true);

    // Check if fenced
    const isFenced = await fence.isFenced(connectorId);
    expect(isFenced).toBe(true);

    // Get current token
    const currentToken = await fence.getCurrentToken(connectorId);
    expect(currentToken).toBe(token);

    // Release fence
    const released = await fence.releaseFence(connectorId, token);
    expect(released).toBe(true);

    // Verify fence is released
    const isFencedAfter = await fence.isFenced(connectorId);
    expect(isFencedAfter).toBe(false);
  });

  test("monotonic token generation", async () => {
    const connectorId = "test-connector-monotonic";

    // Acquire multiple tokens
    const token1 = await fence.acquireFence(connectorId);
    const token2 = await fence.acquireFence(connectorId);
    const token3 = await fence.acquireFence(connectorId);

    expect(token2).toBe(token1 + 1);
    expect(token3).toBe(token2 + 1);

    // Cleanup
    await fence.forceRelease(connectorId);
  });

  test("exactly-once execution guarantee (race condition simulation)", async () => {
    const connectorId = "test-connector-race";

    // Worker 1 acquires fence
    const token1 = await fence.acquireFence(connectorId);
    expect(await fence.validateFence(connectorId, token1)).toBe(true);

    // Worker 2 tries to acquire fence (simulates race condition)
    const token2 = await fence.acquireFence(connectorId);
    expect(token2).not.toBe(token1);

    // Worker 1's token should now be invalid (superseded by Worker 2)
    const isWorker1Valid = await fence.validateFence(connectorId, token1);
    expect(isWorker1Valid).toBe(false);

    // Worker 2's token should still be valid
    const isWorker2Valid = await fence.validateFence(connectorId, token2);
    expect(isWorker2Valid).toBe(true);

    // Only Worker 2 can release the fence
    const worker1Release = await fence.releaseFence(connectorId, token1);
    expect(worker1Release).toBe(false);

    const worker2Release = await fence.releaseFence(connectorId, token2);
    expect(worker2Release).toBe(true);
  });

  test("fence TTL expiration (prevents stuck fences)", async () => {
    const connectorId = "test-connector-ttl";

    // Acquire fence with short TTL (2 seconds)
    const token = await fence.acquireFence(connectorId, 2);
    expect(await fence.isFenced(connectorId)).toBe(true);

    // Wait for TTL to expire (3 seconds)
    await sleep(3000);

    // Fence should have expired
    const isFencedAfter = await fence.isFenced(connectorId);
    expect(isFencedAfter).toBe(false);

    // Token validation should fail after expiry
    const isValidAfter = await fence.validateFence(connectorId, token);
    expect(isValidAfter).toBe(false);
  }, 5000); // Test timeout: 5 seconds

  test("fence extension for long-running operations", async () => {
    const connectorId = "test-connector-extend";

    // Acquire fence with short TTL
    const token = await fence.acquireFence(connectorId, 5);

    // Extend the fence
    const extended = await fence.extendFence(connectorId, token, 10);
    expect(extended).toBe(true);

    // Fence should still be valid after original TTL
    await sleep(6000);
    const isValid = await fence.validateFence(connectorId, token);
    expect(isValid).toBe(true);

    // Cleanup
    await fence.releaseFence(connectorId, token);
  }, 10000); // Test timeout: 10 seconds

  test("force release for debugging/cleanup", async () => {
    const connectorId = "test-connector-force";

    // Acquire fence
    const token = await fence.acquireFence(connectorId);
    expect(await fence.isFenced(connectorId)).toBe(true);

    // Force release (admin override)
    const forceReleased = await fence.forceRelease(connectorId);
    expect(forceReleased).toBe(true);

    // Fence should be released regardless of token
    const isFencedAfter = await fence.isFenced(connectorId);
    expect(isFencedAfter).toBe(false);
  });
});

