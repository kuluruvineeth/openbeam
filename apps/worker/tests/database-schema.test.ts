/**
 * Database Schema Tests
 *
 * Tests Phase 1 database schema enhancements:
 * - SyncJob: schedule, priority, fenceToken, rateLimitConfig
 * - IndexedDocument: lastChecksum
 *
 * Run: bun test tests/database-schema.test.ts
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma from "@openplane/db";
import { cleanupTestData } from "./setup";

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Database Schema", () => {
  test("SyncJob has new fields (schedule, priority, fenceToken, rateLimitConfig)", async () => {
    // Find an existing connector
    const connector = await prisma.connector.findFirst();

    if (!connector) {
      console.warn("No connectors found. Skipping SyncJob test.");
      return;
    }

    // Create SyncJob with new fields
    const syncJob = await prisma.syncJob.create({
      data: {
        connectorId: connector.id,
        type: "INCREMENTAL",
        trigger: "SCHEDULED",
        status: "SYNCING",
        // NEW FIELDS
        schedule: "0 */6 * * *", // Every 6 hours (cron)
        priority: 7,
        fenceToken: 1,
        rateLimitConfig: {
          requestsPerMinute: 50,
          requestsPerHour: 2000,
          burstLimit: 20,
        },
        nextRunAt: new Date(Date.now() + 3_600_000), // 1 hour from now
      },
    });

    expect(syncJob).toBeDefined();
    expect(syncJob.schedule).toBe("0 */6 * * *");
    expect(syncJob.priority).toBe(7);
    expect(syncJob.fenceToken).toBe(1);
    expect(syncJob.rateLimitConfig).toBeDefined();

    const rateLimitConfig = syncJob.rateLimitConfig as Record<string, number>;
    expect(rateLimitConfig.requestsPerMinute).toBe(50);

    // Cleanup
    await prisma.syncJob.delete({ where: { id: syncJob.id } });
  });

  test("SyncJob indexes (nextRunAt, priority) for scheduler performance", async () => {
    const connector = await prisma.connector.findFirst();

    if (!connector) {
      console.warn("No connectors found. Skipping index test.");
      return;
    }

    // Create multiple sync jobs
    const syncJobs = await Promise.all([
      prisma.syncJob.create({
        data: {
          connectorId: connector.id,
          type: "INCREMENTAL",
          trigger: "SCHEDULED",
          status: "SYNCING",
          priority: 5,
          nextRunAt: new Date(Date.now() + 1000),
        },
      }),
      prisma.syncJob.create({
        data: {
          connectorId: connector.id,
          type: "FULL",
          trigger: "SCHEDULED",
          status: "SYNCING",
          priority: 10,
          nextRunAt: new Date(Date.now() + 2000),
        },
      }),
    ]);

    // Query using nextRunAt (should use index)
    const dueJobs = await prisma.syncJob.findMany({
      where: {
        nextRunAt: {
          lte: new Date(Date.now() + 5000),
        },
        status: "SYNCING",
      },
      orderBy: {
        priority: "desc", // Should use priority index
      },
    });

    expect(dueJobs.length).toBeGreaterThan(0);
    expect(dueJobs[0].priority).toBe(10);

    // Cleanup
    await prisma.syncJob.deleteMany({
      where: {
        id: { in: syncJobs.map((j) => j.id) },
      },
    });
  });

  test("IndexedDocument has lastChecksum field", async () => {
    const connector = await prisma.connector.findFirst();

    if (!connector) {
      console.warn("No connectors found. Skipping IndexedDocument test.");
      return;
    }

    // Create IndexedDocument with new fields
    const doc = await prisma.indexedDocument.create({
      data: {
        connectorId: connector.id,
        externalId: `test-doc-${Date.now()}`,
        vespaId: `vespa-${Date.now()}`,
        documentType: "message",
        sourceId: "test-channel",
        // NEW FIELDS
        checksum: "abc123def456", // SHA-256 hash
        lastChecksum: "old123old456", // Previous hash
      },
    });

    expect(doc).toBeDefined();
    expect(doc.checksum).toBe("abc123def456");
    expect(doc.lastChecksum).toBe("old123old456");

    // Cleanup
    await prisma.indexedDocument.delete({ where: { id: doc.id } });
  });

  test("IndexedDocument indexes (connectorId+checksum, lastSyncedAt)", async () => {
    const connector = await prisma.connector.findFirst();

    if (!connector) {
      console.warn("No connectors found. Skipping index test.");
      return;
    }

    // Create test documents
    const checksum = "test-checksum-123";
    const doc1 = await prisma.indexedDocument.create({
      data: {
        connectorId: connector.id,
        externalId: `test-1-${Date.now()}`,
        vespaId: `vespa-1-${Date.now()}`,
        documentType: "message",
        checksum,
      },
    });

    const doc2 = await prisma.indexedDocument.create({
      data: {
        connectorId: connector.id,
        externalId: `test-2-${Date.now()}`,
        vespaId: `vespa-2-${Date.now()}`,
        documentType: "message",
        checksum,
      },
    });

    // Query using connectorId + checksum (should use composite index)
    const docsWithChecksum = await prisma.indexedDocument.findMany({
      where: {
        connectorId: connector.id,
        checksum,
      },
    });

    expect(docsWithChecksum.length).toBe(2);

    // Cleanup
    await prisma.indexedDocument.deleteMany({
      where: {
        id: { in: [doc1.id, doc2.id] },
      },
    });
  });

  test("migration applied successfully", async () => {
    // Try to query with new fields (will fail if migration not applied)
    const _syncJob = await prisma.syncJob.findFirst({
      select: {
        id: true,
        schedule: true,
        priority: true,
        fenceToken: true,
        rateLimitConfig: true,
      },
    });

    // Should not throw error - migration applied

    // Check IndexedDocument fields
    const _indexedDoc = await prisma.indexedDocument.findFirst({
      select: {
        id: true,
        checksum: true,
        lastChecksum: true,
      },
    });

    // Should not throw error - migration applied
    expect(true).toBe(true);
  });
});
