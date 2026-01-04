export interface CacheHint {
  type: "ephemeral" | "persistent" | "breakpoint";
  position: number;
  reason: string;
}

export interface CacheOptimizationResult {
  hints: CacheHint[];
  suggestedBreakpoints: number[];
  estimatedCacheHitRate: number;
}

export interface CacheOptimizerOptions {
  minPersistentLength?: number;
  maxBreakpoints?: number;
}

const DEFAULT_MIN_PERSISTENT_LENGTH = 1000;
const DEFAULT_MAX_BREAKPOINTS = 5;

const CACHE_MARKERS: Record<CacheHint["type"], string> = {
  persistent: "<!-- cache:persistent -->",
  ephemeral: "<!-- cache:ephemeral -->",
  breakpoint: "<!-- cache:breakpoint -->",
};

export class CacheOptimizer {
  private readonly minPersistentLength: number;
  private readonly maxBreakpoints: number;

  constructor(options: CacheOptimizerOptions = {}) {
    this.minPersistentLength =
      options.minPersistentLength ?? DEFAULT_MIN_PERSISTENT_LENGTH;
    this.maxBreakpoints = options.maxBreakpoints ?? DEFAULT_MAX_BREAKPOINTS;
  }

  analyzeContent(content: string): CacheOptimizationResult {
    const hints: CacheHint[] = [];
    const breakpoints: number[] = [];

    const systemPatterns = this.findSystemInstructions(content);
    for (const pos of systemPatterns) {
      hints.push({
        type: "persistent",
        position: pos,
        reason: "system_instruction",
      });
    }

    const toolOutputs = this.findToolOutputs(content);
    for (const pos of toolOutputs) {
      hints.push({
        type: "ephemeral",
        position: pos,
        reason: "tool_output",
      });
    }

    const sections = this.findSectionBreaks(content);
    for (const pos of sections.slice(0, this.maxBreakpoints)) {
      breakpoints.push(pos);
      hints.push({
        type: "breakpoint",
        position: pos,
        reason: "section_break",
      });
    }

    const cacheHitRate = this.estimateCacheHitRate(hints, content.length);

    return {
      hints,
      suggestedBreakpoints: breakpoints,
      estimatedCacheHitRate: cacheHitRate,
    };
  }

  suggestPrefixLength(content: string): number {
    const result = this.analyzeContent(content);

    const persistentHints = result.hints.filter((h) => h.type === "persistent");
    if (persistentHints.length === 0) {
      return Math.min(this.minPersistentLength, content.length);
    }

    const maxPersistent = Math.max(...persistentHints.map((h) => h.position));
    return maxPersistent + this.minPersistentLength;
  }

  markEphemeral(_content: string, start: number, end: number): CacheHint {
    return {
      type: "ephemeral",
      position: start,
      reason: `ephemeral_range_${start}_${end}`,
    };
  }

  markPersistent(_content: string, position: number): CacheHint {
    return {
      type: "persistent",
      position,
      reason: "manual_persistent",
    };
  }

  private findSystemInstructions(content: string): number[] {
    const positions: number[] = [];
    const patterns = [
      /^You are/gm,
      /^<system>/gm,
      /^## Instructions/gm,
      /^# System/gm,
    ];

    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        if (match.index !== undefined) {
          positions.push(match.index);
        }
      }
    }

    return positions;
  }

  private findToolOutputs(content: string): number[] {
    const positions: number[] = [];
    const patterns = [/<tool_result>/g, /\[Tool Output\]/g, /```output/g];

    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        if (match.index !== undefined) {
          positions.push(match.index);
        }
      }
    }

    return positions;
  }

  private findSectionBreaks(content: string): number[] {
    const positions: number[] = [];
    const pattern = /\n#{1,3}\s+/g;

    for (const match of content.matchAll(pattern)) {
      if (match.index !== undefined) {
        positions.push(match.index);
      }
    }

    return positions;
  }

  private estimateCacheHitRate(
    hints: CacheHint[],
    contentLength: number
  ): number {
    const persistentLength = hints
      .filter((h) => h.type === "persistent")
      .reduce((sum, h) => sum + (contentLength - h.position) / hints.length, 0);

    return Math.min(persistentLength / contentLength, 0.9);
  }
}

export function createCacheOptimizer(
  options?: CacheOptimizerOptions
): CacheOptimizer {
  return new CacheOptimizer(options);
}

export function formatWithCacheHints(
  content: string,
  hints: CacheHint[]
): string {
  const sorted = [...hints].sort((a, b) => b.position - a.position);
  let result = content;

  for (const hint of sorted) {
    const marker = CACHE_MARKERS[hint.type];
    result =
      result.slice(0, hint.position) + marker + result.slice(hint.position);
  }

  return result;
}
