import { describe, expect, it } from "bun:test";
import {
  HISTORY_EVENT_THRESHOLD,
  SHARD_THRESHOLD,
  SpawnLimitsSchema,
  SWARM_PRESETS,
  type SwarmPresetId,
  SwarmPresetIdSchema,
} from "../mission";

describe("SWARM_PRESETS", () => {
  it("has exactly 4 entries", () => {
    expect(Object.keys(SWARM_PRESETS)).toHaveLength(4);
    expect(Object.keys(SWARM_PRESETS)).toEqual([
      "small",
      "medium",
      "large",
      "swarm",
    ]);
  });

  it.each(Object.entries(SWARM_PRESETS))(
    "%s preset spawnLimits validates against SpawnLimitsSchema",
    (_id, preset) => {
      const result = SpawnLimitsSchema.safeParse(preset.spawnLimits);
      expect(result.success).toBe(true);
    }
  );

  it("small preset has expected values", () => {
    expect(SWARM_PRESETS.small.budgetCents).toBe(500);
    expect(SWARM_PRESETS.small.maxConcurrentRuns).toBe(3);
    expect(SWARM_PRESETS.small.spawnLimits.maxSpawnedAgentsPerMission).toBe(5);
  });

  it("swarm preset has expected values", () => {
    expect(SWARM_PRESETS.swarm.budgetCents).toBe(50_000);
    expect(SWARM_PRESETS.swarm.maxConcurrentRuns).toBe(20);
    expect(SWARM_PRESETS.swarm.spawnLimits.maxSpawnedAgentsPerMission).toBe(
      500
    );
  });

  it("presets scale monotonically in budget and concurrency", () => {
    const order: SwarmPresetId[] = ["small", "medium", "large", "swarm"];
    for (let i = 1; i < order.length; i++) {
      const prevKey = order[i - 1] as SwarmPresetId;
      const currKey = order[i] as SwarmPresetId;
      const prev = SWARM_PRESETS[prevKey];
      const curr = SWARM_PRESETS[currKey];
      expect(curr.budgetCents).toBeGreaterThan(prev.budgetCents);
      expect(curr.maxConcurrentRuns).toBeGreaterThan(prev.maxConcurrentRuns);
      expect(curr.spawnLimits.maxSpawnedAgentsPerMission).toBeGreaterThan(
        prev.spawnLimits.maxSpawnedAgentsPerMission
      );
    }
  });
});

describe("SwarmPresetIdSchema", () => {
  it("parses valid IDs", () => {
    expect(SwarmPresetIdSchema.parse("small")).toBe("small");
    expect(SwarmPresetIdSchema.parse("medium")).toBe("medium");
    expect(SwarmPresetIdSchema.parse("large")).toBe("large");
    expect(SwarmPresetIdSchema.parse("swarm")).toBe("swarm");
  });

  it("rejects unknown IDs", () => {
    expect(() => SwarmPresetIdSchema.parse("unknown")).toThrow();
    expect(() => SwarmPresetIdSchema.parse("xl")).toThrow();
    expect(() => SwarmPresetIdSchema.parse("")).toThrow();
  });
});

describe("Shard constants", () => {
  it("SHARD_THRESHOLD is 50", () => {
    expect(SHARD_THRESHOLD).toBe(50);
  });

  it("HISTORY_EVENT_THRESHOLD is 30000", () => {
    expect(HISTORY_EVENT_THRESHOLD).toBe(30_000);
  });
});
