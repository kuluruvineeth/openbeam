/**
 * Test Setup and Utilities
 * Shared configuration and helpers for all tests
 */

import prisma from "@openplane/db";
import { fence, rateLimiter } from "@openplane/redis";

/**
 * Sleep utility for tests
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cleanup test data from Redis and Database
 */
export async function cleanupTestData() {
  try {
    // Clean up test fence keys
    const testFences = [
      "test-connector-fence",
      "test-connector-basic",
      "test-connector-monotonic",
      "test-connector-race",
      "test-connector-ttl",
      "test-connector-extend",
      "test-connector-force",
    ];
    
    for (const connectorId of testFences) {
      await fence.forceRelease(connectorId).catch(() => {});
    }

    // Clean up test rate limit keys
    const testRateLimits = [
      "test-basic",
      "test-burst",
      "test-quota",
      "test-wait",
      "test-custom",
      "test-slack",
      "test-notion",
    ];
    
    for (const connectorId of testRateLimits) {
      await rateLimiter.reset(`connector:${connectorId}:burst`).catch(() => {});
      await rateLimiter.reset(`connector:${connectorId}:minute`).catch(() => {});
      await rateLimiter.reset(`connector:${connectorId}:hour`).catch(() => {});
    }

    // Clean up test sync jobs (if any exist with test- prefix)
    await prisma.syncJob.deleteMany({
      where: {
        connector: {
          name: {
            startsWith: "test-",
          },
        },
      },
    }).catch(() => {});
  } catch (error) {
    // Ignore cleanup errors
    console.warn("Cleanup warning:", error);
  }
}

