import { describe, expect, test } from "bun:test";
import { detectBandwidthPolicy } from "../bandwidth-detector";

describe("detectBandwidthPolicy", () => {
  test("high bandwidth returns full sync mode", () => {
    const policy = detectBandwidthPolicy(15_000);
    expect(policy.syncMode).toBe("full");
    expect(policy.compressionEnabled).toBe(false);
    expect(policy.maxBatchSizeKb).toBe(10_240);
  });

  test("medium bandwidth returns incremental mode", () => {
    const policy = detectBandwidthPolicy(5000);
    expect(policy.syncMode).toBe("incremental");
    expect(policy.compressionEnabled).toBe(true);
    expect(policy.maxBatchSizeKb).toBe(2048);
  });

  test("low bandwidth returns metadata_only mode", () => {
    const policy = detectBandwidthPolicy(500);
    expect(policy.syncMode).toBe("metadata_only");
    expect(policy.compressionEnabled).toBe(true);
    expect(policy.maxBatchSizeKb).toBe(512);
  });

  test("very low bandwidth returns manual mode", () => {
    const policy = detectBandwidthPolicy(50);
    expect(policy.syncMode).toBe("manual");
    expect(policy.compressionEnabled).toBe(true);
    expect(policy.maxBatchSizeKb).toBe(128);
  });

  test("zero bandwidth returns manual mode", () => {
    const policy = detectBandwidthPolicy(0);
    expect(policy.syncMode).toBe("manual");
    expect(policy.maxBatchSizeKb).toBe(128);
  });

  test("exact threshold for full mode boundary", () => {
    const policy = detectBandwidthPolicy(10_000);
    expect(policy.syncMode).toBe("full");
  });

  test("exact threshold for incremental mode boundary", () => {
    const policy = detectBandwidthPolicy(1000);
    expect(policy.syncMode).toBe("incremental");
  });

  test("exact threshold for metadata_only mode boundary", () => {
    const policy = detectBandwidthPolicy(100);
    expect(policy.syncMode).toBe("metadata_only");
  });

  test("just below full threshold returns incremental", () => {
    const policy = detectBandwidthPolicy(9999);
    expect(policy.syncMode).toBe("incremental");
  });

  test("just below incremental threshold returns metadata_only", () => {
    const policy = detectBandwidthPolicy(999);
    expect(policy.syncMode).toBe("metadata_only");
  });

  test("just below metadata_only threshold returns manual", () => {
    const policy = detectBandwidthPolicy(99);
    expect(policy.syncMode).toBe("manual");
  });

  test("preserves estimatedKbps in output", () => {
    const policy = detectBandwidthPolicy(7500);
    expect(policy.estimatedKbps).toBe(7500);
  });

  test("compression disabled only for full sync", () => {
    expect(detectBandwidthPolicy(10_000).compressionEnabled).toBe(false);
    expect(detectBandwidthPolicy(5000).compressionEnabled).toBe(true);
    expect(detectBandwidthPolicy(500).compressionEnabled).toBe(true);
    expect(detectBandwidthPolicy(50).compressionEnabled).toBe(true);
  });
});
