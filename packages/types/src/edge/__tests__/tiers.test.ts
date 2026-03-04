import { describe, expect, it } from "bun:test";
import {
  detectTier,
  EdgeTierSchema,
  type HardwareCapabilities,
  HardwareCapabilitiesSchema,
  HardwarePlatformSchema,
  TIER_THRESHOLDS,
} from "../tiers";

function makeCapabilities(
  overrides: Partial<HardwareCapabilities> = {}
): HardwareCapabilities {
  return {
    cpuCores: 4,
    ramMb: 8192,
    storageMb: 32_768,
    hasGpu: false,
    platform: "generic_x86",
    ...overrides,
  };
}

describe("EdgeTierSchema", () => {
  it("accepts valid tiers", () => {
    for (const tier of [
      "sensor_gateway",
      "standard",
      "performance",
      "enterprise",
    ]) {
      expect(EdgeTierSchema.parse(tier)).toBe(tier);
    }
  });

  it("rejects invalid tier", () => {
    expect(() => EdgeTierSchema.parse("mega")).toThrow();
  });
});

describe("HardwarePlatformSchema", () => {
  it("accepts all platforms", () => {
    const platforms = [
      "raspberry_pi",
      "jetson_nano",
      "jetson_orin",
      "intel_nuc",
      "generic_x86",
      "generic_arm64",
      "custom",
    ];
    for (const p of platforms) {
      expect(HardwarePlatformSchema.parse(p)).toBe(p);
    }
  });
});

describe("HardwareCapabilitiesSchema", () => {
  it("parses valid capabilities", () => {
    const caps = makeCapabilities();
    const parsed = HardwareCapabilitiesSchema.parse(caps);
    expect(parsed.cpuCores).toBe(4);
    expect(parsed.ramMb).toBe(8192);
  });

  it("rejects negative values", () => {
    expect(() =>
      HardwareCapabilitiesSchema.parse(makeCapabilities({ cpuCores: -1 }))
    ).toThrow();
  });

  it("allows optional gpu fields", () => {
    const caps = makeCapabilities({ hasGpu: true, gpuMemoryMb: 4096 });
    const parsed = HardwareCapabilitiesSchema.parse(caps);
    expect(parsed.gpuMemoryMb).toBe(4096);
  });

  it("allows optional network bandwidth", () => {
    const parsed = HardwareCapabilitiesSchema.parse(
      makeCapabilities({ networkBandwidthKbps: 10_000 })
    );
    expect(parsed.networkBandwidthKbps).toBe(10_000);
  });
});

describe("TIER_THRESHOLDS", () => {
  it("has ascending resource requirements", () => {
    const tiers = [
      "sensor_gateway",
      "standard",
      "performance",
      "enterprise",
    ] as const;
    for (let i = 1; i < tiers.length; i += 1) {
      expect(TIER_THRESHOLDS[tiers[i]].minRamMb).toBeGreaterThan(
        TIER_THRESHOLDS[tiers[i - 1]].minRamMb
      );
    }
  });
});

describe("detectTier", () => {
  it("detects enterprise tier", () => {
    expect(
      detectTier(
        makeCapabilities({
          cpuCores: 16,
          ramMb: 65_536,
          storageMb: 262_144,
        })
      )
    ).toBe("enterprise");
  });

  it("detects performance tier", () => {
    expect(
      detectTier(
        makeCapabilities({
          cpuCores: 4,
          ramMb: 8192,
          storageMb: 32_768,
        })
      )
    ).toBe("performance");
  });

  it("detects standard tier", () => {
    expect(
      detectTier(
        makeCapabilities({
          cpuCores: 2,
          ramMb: 2048,
          storageMb: 8192,
        })
      )
    ).toBe("standard");
  });

  it("detects sensor_gateway tier for low resources", () => {
    expect(
      detectTier(
        makeCapabilities({
          cpuCores: 1,
          ramMb: 512,
          storageMb: 2048,
        })
      )
    ).toBe("sensor_gateway");
  });

  it("defaults to sensor_gateway for minimal hardware", () => {
    expect(
      detectTier(
        makeCapabilities({
          cpuCores: 1,
          ramMb: 128,
          storageMb: 512,
        })
      )
    ).toBe("sensor_gateway");
  });

  it("uses lowest qualifying tier when between thresholds", () => {
    expect(
      detectTier(
        makeCapabilities({
          cpuCores: 2,
          ramMb: 4096,
          storageMb: 8192,
        })
      )
    ).toBe("standard");
  });
});
