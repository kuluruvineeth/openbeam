import type { ModelMessage } from "ai";
import { createTokenEstimator, estimateTokenCount } from "./estimator";
import type {
  ContextManagerOptions,
  ContextSnapshot,
  ContextWindow,
  MaskedObservation,
  ObservationMask,
  TokenEstimator,
} from "./types";

const DEFAULT_MAX_TOKENS = 128_000;
const DEFAULT_RESERVE_TOKENS = 4096;
const DEFAULT_AUTO_MASK_THRESHOLD = 0.7;
const DEFAULT_LARGE_OBSERVATION_THRESHOLD = 2000;

export class ContextManager {
  private readonly maxTokens: number;
  private readonly reserveTokens: number;
  private readonly autoMaskThreshold: number;
  private readonly largeObservationThreshold: number;
  private readonly summarizeLargeObservations: boolean;
  private readonly estimator: TokenEstimator;

  private messages: ModelMessage[] = [];
  private observations: MaskedObservation[] = [];
  private readonly masks: Map<string, ObservationMask> = new Map();
  private observationCounter = 0;

  constructor(options: ContextManagerOptions = {}) {
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.reserveTokens = options.reserveTokens ?? DEFAULT_RESERVE_TOKENS;
    this.autoMaskThreshold =
      options.autoMaskThreshold ?? DEFAULT_AUTO_MASK_THRESHOLD;
    this.largeObservationThreshold =
      options.largeObservationThreshold ?? DEFAULT_LARGE_OBSERVATION_THRESHOLD;
    this.summarizeLargeObservations =
      options.summarizeLargeObservations ?? true;
    this.estimator = createTokenEstimator();
  }

  addMessage(message: ModelMessage): void {
    this.messages.push(message);
    this.checkAutoMask();
  }

  addObservation(toolName: string, content: string, summary?: string): string {
    this.observationCounter += 1;
    const id = `obs_${this.observationCounter}`;
    const tokenCount = estimateTokenCount(content);
    const isLarge = tokenCount > this.largeObservationThreshold;

    const observation: MaskedObservation = {
      id,
      toolName,
      summary: summary ?? this.generateSummary(content, toolName),
      fullContent: content,
      masked: false,
      tokenCount,
      timestamp: Date.now(),
    };

    this.observations.push(observation);

    if (isLarge && this.summarizeLargeObservations) {
      this.maskObservation(id, "large");
    }

    this.checkAutoMask();
    return id;
  }

  maskObservation(
    observationId: string,
    reason: ObservationMask["reason"]
  ): boolean {
    const observation = this.observations.find((o) => o.id === observationId);
    if (!observation) {
      return false;
    }

    observation.masked = true;
    this.masks.set(observationId, {
      observationId,
      masked: true,
      reason,
      estimatedTokens: observation.tokenCount,
    });
    return true;
  }

  unmaskObservation(observationId: string): boolean {
    const observation = this.observations.find((o) => o.id === observationId);
    if (!observation) {
      return false;
    }

    observation.masked = false;
    this.masks.delete(observationId);
    return true;
  }

  getContextWindow(): ContextWindow {
    const usedTokens = this.calculateUsedTokens();
    const effectiveMax = this.maxTokens - this.reserveTokens;

    return {
      maxTokens: this.maxTokens,
      usedTokens,
      availableTokens: Math.max(0, effectiveMax - usedTokens),
      utilizationPercent: usedTokens / effectiveMax,
    };
  }

  getSnapshot(): ContextSnapshot {
    const window = this.getContextWindow();
    const maskedCount = this.observations.filter((o) => o.masked).length;

    return {
      messages: [...this.messages],
      observations: [...this.observations],
      totalTokens: window.usedTokens,
      maskedCount,
      utilization: window.utilizationPercent,
    };
  }

  getVisibleObservations(): MaskedObservation[] {
    return this.observations.filter((o) => !o.masked);
  }

  getMaskedObservations(): MaskedObservation[] {
    return this.observations.filter((o) => o.masked);
  }

  getObservationContent(observationId: string): string | null {
    const observation = this.observations.find((o) => o.id === observationId);
    if (!observation) {
      return null;
    }
    return observation.masked ? observation.summary : observation.fullContent;
  }

  revealObservation(observationId: string): string | null {
    const observation = this.observations.find((o) => o.id === observationId);
    if (!observation) {
      return null;
    }

    this.unmaskObservation(observationId);
    return observation.fullContent;
  }

  buildContextString(): string {
    const parts: string[] = [];

    for (const observation of this.observations) {
      if (observation.masked) {
        parts.push(`[${observation.toolName}]: ${observation.summary}`);
      } else {
        parts.push(`[${observation.toolName}]:\n${observation.fullContent}`);
      }
    }

    return parts.join("\n\n");
  }

  compact(): { removedCount: number; tokensSaved: number } {
    const staleThreshold = Date.now() - 30 * 60 * 1000;
    let removedCount = 0;
    let tokensSaved = 0;

    for (const observation of this.observations) {
      if (!observation.masked && observation.timestamp < staleThreshold) {
        this.maskObservation(observation.id, "stale");
        tokensSaved +=
          observation.tokenCount - estimateTokenCount(observation.summary);
        removedCount += 1;
      }
    }

    return { removedCount, tokensSaved };
  }

  reset(): void {
    this.messages = [];
    this.observations = [];
    this.masks.clear();
    this.observationCounter = 0;
  }

  private calculateUsedTokens(): number {
    let total = this.estimator.estimateMessages(this.messages);

    for (const observation of this.observations) {
      if (observation.masked) {
        total += estimateTokenCount(observation.summary);
      } else {
        total += observation.tokenCount;
      }
    }

    return total;
  }

  private checkAutoMask(): void {
    const window = this.getContextWindow();
    if (window.utilizationPercent < this.autoMaskThreshold) {
      return;
    }

    const sorted = [...this.observations]
      .filter((o) => !o.masked)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const observation of sorted) {
      if (window.utilizationPercent < this.autoMaskThreshold) {
        break;
      }
      this.maskObservation(observation.id, "stale");
    }
  }

  private generateSummary(content: string, toolName: string): string {
    const lines = content.split("\n").filter((l) => l.trim());
    const preview = lines.slice(0, 2).join(" ").slice(0, 200);
    return `${toolName} returned ${lines.length} lines. Preview: ${preview}...`;
  }
}

export function createContextManager(
  options?: ContextManagerOptions
): ContextManager {
  return new ContextManager(options);
}
