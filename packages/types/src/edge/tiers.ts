import { z } from "zod";

export const EdgeTierSchema = z.enum([
  "sensor_gateway",
  "standard",
  "performance",
  "enterprise",
]);

export type EdgeTier = z.infer<typeof EdgeTierSchema>;

export const HardwarePlatformSchema = z.enum([
  "raspberry_pi",
  "jetson_nano",
  "jetson_orin",
  "intel_nuc",
  "generic_x86",
  "generic_arm64",
  "custom",
]);

export type HardwarePlatform = z.infer<typeof HardwarePlatformSchema>;

export const HardwareCapabilitiesSchema = z.object({
  cpuCores: z.number().int().positive(),
  ramMb: z.number().int().positive(),
  storageMb: z.number().int().positive(),
  hasGpu: z.boolean(),
  gpuMemoryMb: z.number().int().nonnegative().optional(),
  platform: HardwarePlatformSchema,
  networkBandwidthKbps: z.number().nonnegative().optional(),
});

export type HardwareCapabilities = z.infer<typeof HardwareCapabilitiesSchema>;

export const TIER_THRESHOLDS: Record<
  EdgeTier,
  { minRamMb: number; minCores: number; minStorageMb: number }
> = {
  sensor_gateway: { minRamMb: 256, minCores: 1, minStorageMb: 1024 },
  standard: { minRamMb: 2048, minCores: 2, minStorageMb: 8192 },
  performance: { minRamMb: 8192, minCores: 4, minStorageMb: 32_768 },
  enterprise: { minRamMb: 32_768, minCores: 8, minStorageMb: 131_072 },
};

export function detectTier(capabilities: HardwareCapabilities): EdgeTier {
  const tiers: EdgeTier[] = [
    "enterprise",
    "performance",
    "standard",
    "sensor_gateway",
  ];

  for (const tier of tiers) {
    const threshold = TIER_THRESHOLDS[tier];
    if (
      capabilities.ramMb >= threshold.minRamMb &&
      capabilities.cpuCores >= threshold.minCores &&
      capabilities.storageMb >= threshold.minStorageMb
    ) {
      return tier;
    }
  }

  return "sensor_gateway";
}
