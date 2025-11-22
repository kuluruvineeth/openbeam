/**
 * Rate Limiting Tests
 *
 * Tests the three-level rate limiting system:
 * 1. Global (prevent Redis overload)
 * 2. Per-Connector (respect API limits)
 * 3. Per-Connector-Type (default limits)
 *
 * Run: bun test tests/rate-limiting.test.ts
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { DEFAULT_RATE_LIMITS, rateLimiter } from "@openplane/redis";
import { cleanupTestData } from "./setup";

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Rate Limiting", () => {
  test("basic rate limit check", async () => {
    const testKey = "test-basic";

    // First requests should be allowed
    for (let i = 0; i < 5; i++) {
      const allowed = await rateLimiter.checkLimit(testKey, 10, 60);
      expect(allowed).toBe(true);
    }

    // Get usage
    const usage = await rateLimiter.getUsage(testKey, 60);
    expect(usage).toBeGreaterThan(0);

    // Cleanup
    await rateLimiter.reset(testKey);
  });

  test("burst limit enforcement", async () => {
    const connectorId = "test-burst";
    let deniedAt = -1;

    // Slack burst limit is 20 requests in 10 seconds
    for (let i = 0; i < 25; i++) {
      const result = await rateLimiter.checkConnectorRateLimit(
        connectorId,
        "slack"
      );

      if (!result.allowed && deniedAt === -1) {
        deniedAt = i;
        expect(deniedAt).toBeGreaterThan(15);
        expect(result.reason).toBe("Burst limit exceeded");
        break;
      }
    }

    expect(deniedAt).toBeGreaterThan(-1);
    await rateLimiter.reset(`connector:${connectorId}:burst`);
  });

  test("remaining quota tracking", async () => {
    const connectorId = "test-quota";

    // Initial quota should be full
    const initialQuota = await rateLimiter.getRemainingQuota(
      connectorId,
      "slack"
    );

    expect(initialQuota.burstRemaining).toBeDefined();
    expect(initialQuota.minuteRemaining).toBeDefined();
    expect(initialQuota.hourRemaining).toBeDefined();

    // Make some requests
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkConnectorRateLimit(connectorId, "slack");
    }

    // Quota should decrease
    const afterQuota = await rateLimiter.getRemainingQuota(
      connectorId,
      "slack"
    );

    expect(afterQuota.burstRemaining).toBeDefined();
    expect(initialQuota.burstRemaining).toBeDefined();
    if (afterQuota.burstRemaining && initialQuota.burstRemaining) {
      expect(afterQuota.burstRemaining).toBeLessThan(
        initialQuota.burstRemaining
      );
    }
  });

  test("different connector types have different limits", () => {
    // Slack limits
    const slackLimits = DEFAULT_RATE_LIMITS.slack;
    expect(slackLimits.requestsPerMinute).toBe(50);
    expect(slackLimits.requestsPerHour).toBe(2000);

    // Notion limits
    const notionLimits = DEFAULT_RATE_LIMITS.notion;
    expect(notionLimits.requestsPerMinute).toBe(30);
    expect(notionLimits.requestsPerHour).toBe(1000);

    // Drive limits
    const driveLimits = DEFAULT_RATE_LIMITS.drive;
    expect(driveLimits.requestsPerMinute).toBe(100);
  });

  test("custom rate limit configuration override", async () => {
    const connectorId = "test-custom";

    const customConfig = {
      requestsPerMinute: 10,
      requestsPerHour: 500,
      burstLimit: 5,
    };

    // Exhaust custom burst limit (5)
    let allowed = 0;
    for (let i = 0; i < 10; i++) {
      const result = await rateLimiter.checkConnectorRateLimit(
        connectorId,
        "slack",
        customConfig
      );
      if (result.allowed) {
        allowed += 1;
      } else {
        break;
      }
    }

    expect(allowed).toBeLessThanOrEqual(6);
    await rateLimiter.reset(`connector:${connectorId}:burst`);
  });

  test("global rate limit prevents Redis overload", async () => {
    // Global limit should be high (1000 req/sec default)
    const allowed = await rateLimiter.checkGlobalRateLimit(1000);
    expect(allowed).toBe(true);

    // With very low limit, should eventually be denied
    let denied = false;
    for (let i = 0; i < 10; i++) {
      const check = await rateLimiter.checkGlobalRateLimit(5);
      if (!check) {
        denied = true;
        break;
      }
    }

    expect(denied).toBe(true);
  });

  test("wait for quota with exponential backoff", async () => {
    const connectorId = "test-wait";

    // Exhaust burst limit
    for (let i = 0; i < 25; i++) {
      await rateLimiter.checkConnectorRateLimit(connectorId, "slack");
    }

    // Should be rate limited now
    const check = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "slack"
    );
    expect(check.allowed).toBe(false);

    // Wait for quota (with max 2 retries for faster test)
    const startTime = Date.now();
    await rateLimiter.waitForQuota(connectorId, "slack", undefined, 2);
    const duration = Date.now() - startTime;

    // Should have waited at least 2 seconds
    expect(duration).toBeGreaterThan(2000);

    await rateLimiter.reset(`connector:${connectorId}:burst`);
  }, 10_000); // Test timeout: 10 seconds
});
