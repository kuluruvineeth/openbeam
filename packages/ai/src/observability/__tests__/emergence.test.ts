import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetEmergingPatterns = mock(() =>
  Promise.resolve([
    {
      id: "pattern_1",
      signature: "abc123",
      toolSequence: ["search_hybrid", "doc_get", "rag_answer"],
      sequenceLength: 3,
      frequency: 100,
      successCount: 90,
      failureCount: 10,
      successRate: 0.9,
      avgLatencyMs: 500,
      p95LatencyMs: 1200,
      firstSeen: new Date("2024-01-01"),
      lastSeen: new Date("2024-01-15"),
      status: "OBSERVED",
      formalizedAs: null,
      rejectionReason: null,
      examples: [],
      reviewedAt: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "pattern_2",
      signature: "def456",
      toolSequence: ["search_semantic", "doc_chunks"],
      sequenceLength: 2,
      frequency: 30,
      successCount: 10,
      failureCount: 20,
      successRate: 0.33,
      avgLatencyMs: 800,
      p95LatencyMs: 1500,
      firstSeen: new Date("2024-01-10"),
      lastSeen: new Date("2024-01-14"),
      status: "OBSERVED",
      formalizedAs: null,
      rejectionReason: null,
      examples: [],
      reviewedAt: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "pattern_3",
      signature: "ghi789",
      toolSequence: ["connector_list", "connector_status"],
      sequenceLength: 2,
      frequency: 150,
      successCount: 140,
      failureCount: 10,
      successRate: 0.93,
      avgLatencyMs: 200,
      p95LatencyMs: 400,
      firstSeen: new Date("2024-01-05"),
      lastSeen: new Date("2024-01-15"),
      status: "OBSERVED",
      formalizedAs: null,
      rejectionReason: null,
      examples: [],
      reviewedAt: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
);

mock.module("../composition", () => ({
  getEmergingPatterns: mockGetEmergingPatterns,
}));

mock.module("./metrics", () => ({
  aiMetrics: {
    emergencePatternsDetected: {
      inc: mock(() => {
        return;
      }),
    },
  },
}));

import {
  createEmergenceDetector,
  EmergenceDetector,
  EmergencePatternStatusSchema,
  getGlobalEmergenceDetector,
  setGlobalEmergenceDetector,
} from "../emergence";

describe("EmergencePatternStatusSchema", () => {
  it("validates observed status", () => {
    expect(EmergencePatternStatusSchema.parse("observed")).toBe("observed");
  });

  it("validates validated status", () => {
    expect(EmergencePatternStatusSchema.parse("validated")).toBe("validated");
  });

  it("validates formalized status", () => {
    expect(EmergencePatternStatusSchema.parse("formalized")).toBe("formalized");
  });

  it("validates rejected status", () => {
    expect(EmergencePatternStatusSchema.parse("rejected")).toBe("rejected");
  });

  it("throws on invalid status", () => {
    expect(() => EmergencePatternStatusSchema.parse("invalid")).toThrow();
  });
});

describe("EmergenceDetector", () => {
  let detector: EmergenceDetector;

  beforeEach(() => {
    detector = new EmergenceDetector();
    mockGetEmergingPatterns.mockClear();
  });

  describe("constructor", () => {
    it("creates detector with default thresholds", () => {
      const det = new EmergenceDetector();
      const thresholds = det.getThresholds();

      expect(thresholds.minFrequency).toBe(50);
      expect(thresholds.minSuccessRate).toBe(0.8);
      expect(thresholds.minFrequencyForGap).toBe(20);
      expect(thresholds.maxSuccessRateForGap).toBe(0.5);
    });

    it("allows custom thresholds", () => {
      const det = new EmergenceDetector({
        thresholds: { minFrequency: 100, minSuccessRate: 0.9 },
      });
      const thresholds = det.getThresholds();

      expect(thresholds.minFrequency).toBe(100);
      expect(thresholds.minSuccessRate).toBe(0.9);
      expect(thresholds.minFrequencyForGap).toBe(20);
    });
  });

  describe("analyze", () => {
    it("identifies emergent features", async () => {
      const analysis = await detector.analyze();

      expect(analysis.emergentFeatures.length).toBeGreaterThanOrEqual(1);
      const feature = analysis.emergentFeatures.find(
        (p) => p.signature === "abc123"
      );
      expect(feature).toBeDefined();
      expect(feature?.frequency).toBe(100);
      expect(feature?.successRate).toBe(0.9);
    });

    it("identifies capability gaps", async () => {
      const analysis = await detector.analyze();

      expect(analysis.capabilityGaps.length).toBeGreaterThanOrEqual(1);
      const gap = analysis.capabilityGaps.find((p) => p.signature === "def456");
      expect(gap).toBeDefined();
      expect(gap?.successRate).toBeLessThan(0.5);
    });

    it("identifies formalization candidates", async () => {
      const analysis = await detector.analyze();

      expect(analysis.formalizationCandidates.length).toBeGreaterThanOrEqual(1);
      const candidate = analysis.formalizationCandidates.find(
        (p) => p.signature === "ghi789"
      );
      expect(candidate).toBeDefined();
      expect(candidate?.frequency).toBeGreaterThanOrEqual(100);
      expect(candidate?.successRate).toBeGreaterThanOrEqual(0.85);
    });

    it("respects custom limit", async () => {
      await detector.analyze({ limit: 5 });

      expect(mockGetEmergingPatterns).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe("getThresholds", () => {
    it("returns copy of thresholds", () => {
      const thresholds1 = detector.getThresholds();
      const thresholds2 = detector.getThresholds();

      expect(thresholds1).toEqual(thresholds2);
      expect(thresholds1).not.toBe(thresholds2);
    });
  });

  describe("updateThresholds", () => {
    it("updates specific thresholds", () => {
      detector.updateThresholds({ minFrequency: 200 });
      const thresholds = detector.getThresholds();

      expect(thresholds.minFrequency).toBe(200);
      expect(thresholds.minSuccessRate).toBe(0.8);
    });

    it("preserves unupdated thresholds", () => {
      const original = detector.getThresholds();
      detector.updateThresholds({ minFrequency: 200 });
      const updated = detector.getThresholds();

      expect(updated.minSuccessRate).toBe(original.minSuccessRate);
      expect(updated.recentDays).toBe(original.recentDays);
    });
  });
});

describe("createEmergenceDetector", () => {
  it("creates detector instance", () => {
    const detector = createEmergenceDetector();
    expect(detector).toBeInstanceOf(EmergenceDetector);
  });

  it("accepts config options", () => {
    const detector = createEmergenceDetector({
      thresholds: { minFrequency: 75 },
    });
    expect(detector.getThresholds().minFrequency).toBe(75);
  });
});

describe("global detector", () => {
  it("getGlobalEmergenceDetector returns singleton", () => {
    const d1 = getGlobalEmergenceDetector();
    const d2 = getGlobalEmergenceDetector();

    expect(d1).toBe(d2);
  });

  it("setGlobalEmergenceDetector replaces singleton", () => {
    const original = getGlobalEmergenceDetector();
    const custom = new EmergenceDetector({ thresholds: { minFrequency: 999 } });

    setGlobalEmergenceDetector(custom);
    const current = getGlobalEmergenceDetector();

    expect(current).toBe(custom);
    expect(current).not.toBe(original);
    expect(current.getThresholds().minFrequency).toBe(999);
  });
});
