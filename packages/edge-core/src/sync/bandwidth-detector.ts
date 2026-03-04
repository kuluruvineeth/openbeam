import type { BandwidthPolicy } from "@openplane/types/edge/sync";
import { BANDWIDTH_THRESHOLDS } from "@openplane/types/edge/sync";

export function detectBandwidthPolicy(estimatedKbps: number): BandwidthPolicy {
  if (estimatedKbps >= BANDWIDTH_THRESHOLDS.full) {
    return {
      estimatedKbps,
      syncMode: "full",
      maxBatchSizeKb: 10_240,
      compressionEnabled: false,
    };
  }

  if (estimatedKbps >= BANDWIDTH_THRESHOLDS.incremental) {
    return {
      estimatedKbps,
      syncMode: "incremental",
      maxBatchSizeKb: 2048,
      compressionEnabled: true,
    };
  }

  if (estimatedKbps >= BANDWIDTH_THRESHOLDS.metadata_only) {
    return {
      estimatedKbps,
      syncMode: "metadata_only",
      maxBatchSizeKb: 512,
      compressionEnabled: true,
    };
  }

  return {
    estimatedKbps,
    syncMode: "manual",
    maxBatchSizeKb: 128,
    compressionEnabled: true,
  };
}
