import type { ModelMessage } from "ai";

export interface ContextWindow {
  maxTokens: number;
  usedTokens: number;
  availableTokens: number;
  utilizationPercent: number;
}

export interface ObservationMask {
  observationId: string;
  masked: boolean;
  reason: "irrelevant" | "stale" | "large" | "duplicate" | "manual";
  estimatedTokens: number;
}

export interface MaskedObservation {
  id: string;
  toolName: string;
  summary: string;
  fullContent: string;
  masked: boolean;
  tokenCount: number;
  timestamp: number;
}

export interface ContextManagerOptions {
  maxTokens?: number;
  reserveTokens?: number;
  autoMaskThreshold?: number;
  summarizeLargeObservations?: boolean;
  largeObservationThreshold?: number;
}

export interface ContextSnapshot {
  messages: ModelMessage[];
  observations: MaskedObservation[];
  totalTokens: number;
  maskedCount: number;
  utilization: number;
}

export interface TokenEstimator {
  estimate(text: string): number;
  estimateMessages(messages: ModelMessage[]): number;
}
