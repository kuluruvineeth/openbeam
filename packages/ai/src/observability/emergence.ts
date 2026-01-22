import { z } from "zod";
import { getEmergingPatterns } from "./composition";
import { aiMetrics } from "./metrics";

export const EmergencePatternStatusSchema = z.enum([
  "observed",
  "validated",
  "formalized",
  "rejected",
]);

export type EmergencePatternStatus = z.infer<
  typeof EmergencePatternStatusSchema
>;

export interface EmergencePattern {
  signature: string;
  toolSequence: string[];
  frequency: number;
  successRate: number;
  firstSeen: Date;
  lastSeen: Date;
  examples: Array<{
    prompt: string;
    outcome: string;
  }>;
  status: EmergencePatternStatus;
  metadata?: {
    avgLatencyMs?: number;
    promptCategories?: string[];
    teamIds?: string[];
  };
}

export interface EmergenceAnalysis {
  emergentFeatures: EmergencePattern[];
  capabilityGaps: EmergencePattern[];
  recentPatterns: EmergencePattern[];
  formalizationCandidates: EmergencePattern[];
}

const EMERGENCE_THRESHOLDS = {
  minFrequency: 50,
  minSuccessRate: 0.8,
  minFrequencyForGap: 20,
  maxSuccessRateForGap: 0.5,
  recentDays: 7,
  formalizationMinFrequency: 100,
  formalizationMinSuccessRate: 0.85,
} as const;

export interface EmergenceDetectorConfig {
  thresholds?: Partial<typeof EMERGENCE_THRESHOLDS>;
  onPatternDiscovered?: (pattern: EmergencePattern) => void;
  onCapabilityGapFound?: (pattern: EmergencePattern) => void;
}

export class EmergenceDetector {
  private thresholds: typeof EMERGENCE_THRESHOLDS;
  private readonly callbacks: {
    onPatternDiscovered?: (pattern: EmergencePattern) => void;
    onCapabilityGapFound?: (pattern: EmergencePattern) => void;
  };

  constructor(config: EmergenceDetectorConfig = {}) {
    this.thresholds = { ...EMERGENCE_THRESHOLDS, ...config.thresholds };
    this.callbacks = {
      onPatternDiscovered: config.onPatternDiscovered,
      onCapabilityGapFound: config.onCapabilityGapFound,
    };
  }

  async analyze(
    options: { since?: Date; limit?: number } = {}
  ): Promise<EmergenceAnalysis> {
    const patterns = await getEmergingPatterns({
      minFrequency: 1,
      limit: options.limit ?? 1000,
    });

    const now = new Date();
    const recentCutoff = new Date(
      now.getTime() - this.thresholds.recentDays * 24 * 60 * 60 * 1000
    );

    const emergentFeatures: EmergencePattern[] = [];
    const capabilityGaps: EmergencePattern[] = [];
    const recentPatterns: EmergencePattern[] = [];
    const formalizationCandidates: EmergencePattern[] = [];

    for (const p of patterns) {
      const pattern: EmergencePattern = {
        signature: p.signature,
        toolSequence: p.toolSequence,
        frequency: p.frequency,
        successRate: p.successRate,
        firstSeen: p.firstSeen,
        lastSeen: p.lastSeen,
        examples: [],
        status: this.determineStatus(p),
        metadata: {
          avgLatencyMs: p.avgLatencyMs,
        },
      };

      if (p.firstSeen >= recentCutoff) {
        recentPatterns.push(pattern);
      }

      if (this.isEmergentFeature(pattern)) {
        emergentFeatures.push(pattern);
        aiMetrics.emergencePatternsDetected.inc({ status: "emergent_feature" });
        this.callbacks.onPatternDiscovered?.(pattern);
      }

      if (this.isCapabilityGap(pattern)) {
        capabilityGaps.push(pattern);
        aiMetrics.emergencePatternsDetected.inc({ status: "capability_gap" });
        this.callbacks.onCapabilityGapFound?.(pattern);
      }

      if (this.isFormalizationCandidate(pattern)) {
        formalizationCandidates.push(pattern);
        aiMetrics.emergencePatternsDetected.inc({
          status: "formalization_candidate",
        });
      }
    }

    return {
      emergentFeatures,
      capabilityGaps,
      recentPatterns,
      formalizationCandidates,
    };
  }

  private determineStatus(pattern: {
    frequency: number;
    successRate: number;
  }): EmergencePatternStatus {
    if (
      pattern.frequency >= this.thresholds.formalizationMinFrequency &&
      pattern.successRate >= this.thresholds.formalizationMinSuccessRate
    ) {
      return "validated";
    }
    return "observed";
  }

  private isEmergentFeature(pattern: EmergencePattern): boolean {
    return (
      pattern.frequency >= this.thresholds.minFrequency &&
      pattern.successRate >= this.thresholds.minSuccessRate
    );
  }

  private isCapabilityGap(pattern: EmergencePattern): boolean {
    return (
      pattern.frequency >= this.thresholds.minFrequencyForGap &&
      pattern.successRate <= this.thresholds.maxSuccessRateForGap
    );
  }

  private isFormalizationCandidate(pattern: EmergencePattern): boolean {
    return (
      pattern.frequency >= this.thresholds.formalizationMinFrequency &&
      pattern.successRate >= this.thresholds.formalizationMinSuccessRate
    );
  }

  getThresholds(): typeof EMERGENCE_THRESHOLDS {
    return { ...this.thresholds };
  }

  updateThresholds(updates: Partial<typeof EMERGENCE_THRESHOLDS>): void {
    this.thresholds = { ...this.thresholds, ...updates };
  }
}

export function createEmergenceDetector(
  config?: EmergenceDetectorConfig
): EmergenceDetector {
  return new EmergenceDetector(config);
}

let globalDetector: EmergenceDetector | null = null;

export function getGlobalEmergenceDetector(): EmergenceDetector {
  if (!globalDetector) {
    globalDetector = new EmergenceDetector();
  }
  return globalDetector;
}

export function setGlobalEmergenceDetector(detector: EmergenceDetector): void {
  globalDetector = detector;
}
