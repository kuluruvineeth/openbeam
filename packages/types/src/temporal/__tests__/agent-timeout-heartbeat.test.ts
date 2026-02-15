import { describe, expect, it } from "bun:test";
import {
  AgentHeartbeatPayloadSchema,
  ChunkCheckpointSchema,
} from "../agent-heartbeat";
import {
  AgentTimeoutOverrideSchema,
  TIMEOUT_TIERS,
  TimeoutTierConfigSchema,
  TimeoutTierSchema,
} from "../agent-timeouts";

describe("TimeoutTierSchema", () => {
  it("accepts valid tiers", () => {
    for (const tier of ["quick", "standard", "extended", "marathon"] as const) {
      expect(TimeoutTierSchema.parse(tier)).toBe(tier);
    }
  });

  it("rejects invalid tiers", () => {
    expect(() => TimeoutTierSchema.parse("invalid")).toThrow();
  });
});

describe("TIMEOUT_TIERS", () => {
  it("contains valid config for each tier", () => {
    for (const config of Object.values(TIMEOUT_TIERS)) {
      const parsed = TimeoutTierConfigSchema.parse(config);
      expect(parsed.maxChunksPerStep).toBeGreaterThan(0);
      expect(parsed.checkpointEveryNChunks).toBeGreaterThan(0);
    }
  });
});

describe("AgentTimeoutOverrideSchema", () => {
  it("accepts optional overrides", () => {
    const parsed = AgentTimeoutOverrideSchema.parse({
      tier: "extended",
      maxSteps: 100,
      maxChunksPerStep: 20,
    });

    expect(parsed.tier).toBe("extended");
    expect(parsed.maxSteps).toBe(100);
    expect(parsed.maxChunksPerStep).toBe(20);
  });
});

describe("AgentHeartbeatPayloadSchema", () => {
  it("parses valid heartbeat payload", () => {
    const parsed = AgentHeartbeatPayloadSchema.parse({
      phase: "reasoning",
      stepIndex: 2,
      chunkIndex: 3,
      totalChunksCompleted: 3,
      tokensUsed: 1200,
      costCents: 15,
      elapsedMs: 30_000,
    });

    expect(parsed.phase).toBe("reasoning");
    expect(parsed.toolCallsInChunk).toBe(0);
  });

  it("rejects invalid phase", () => {
    expect(() =>
      AgentHeartbeatPayloadSchema.parse({
        phase: "bad",
        stepIndex: 0,
        chunkIndex: 0,
        totalChunksCompleted: 0,
        tokensUsed: 0,
        costCents: 0,
        elapsedMs: 0,
      })
    ).toThrow();
  });
});

describe("ChunkCheckpointSchema", () => {
  it("parses valid checkpoint", () => {
    const parsed = ChunkCheckpointSchema.parse({
      chunkIndex: 4,
      partialArtifacts: [{ id: "a1" }],
      intermediateState: { stage: "synthesizing" },
      tokensUsed: 900,
      costCents: 12,
      timestamp: Date.now(),
    });

    expect(parsed.chunkIndex).toBe(4);
  });
});
