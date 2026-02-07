import type {
  AggregatePatternsOutput,
  AggregratePatternsInput,
  CompositionEvent,
  EmergencePattern,
  PatternExample,
} from "./types";

function createSignature(toolSequence: string[]): string {
  return [...toolSequence].sort().join("→");
}

function createExample(composition: CompositionEvent): PatternExample {
  return {
    prompt: composition.promptCategory,
    outcome: composition.success ? "success" : "failure",
    timestamp: composition.timestamp,
  };
}

function updatePatternStats(
  pattern: EmergencePattern,
  composition: CompositionEvent
): void {
  pattern.frequency += 1;
  pattern.avgLatencyMs =
    (pattern.avgLatencyMs * (pattern.frequency - 1) + composition.latencyMs) /
    pattern.frequency;
  pattern.lastSeen = Math.max(pattern.lastSeen, composition.timestamp);

  const prevSuccessCount = Math.round(
    pattern.successRate * (pattern.frequency - 1)
  );
  const newSuccessCount = composition.success
    ? prevSuccessCount + 1
    : prevSuccessCount;
  pattern.successRate = newSuccessCount / pattern.frequency;

  if (pattern.examples.length < 5) {
    pattern.examples.push(createExample(composition));
  }
}

function createNewPattern(
  signature: string,
  composition: CompositionEvent
): EmergencePattern {
  return {
    signature,
    toolSequence: composition.toolSequence,
    frequency: 1,
    successRate: composition.success ? 1 : 0,
    avgLatencyMs: composition.latencyMs,
    firstSeen: composition.timestamp,
    lastSeen: composition.timestamp,
    status: "observed",
    examples: [createExample(composition)],
  };
}

export function aggregatePatterns(
  input: AggregratePatternsInput
): AggregatePatternsOutput {
  const { events } = input;
  const patternMap = new Map<string, EmergencePattern>();

  for (const composition of events) {
    const signature = createSignature(composition.toolSequence);
    const existing = patternMap.get(signature);

    if (existing) {
      updatePatternStats(existing, composition);
    } else {
      patternMap.set(signature, createNewPattern(signature, composition));
    }
  }

  return {
    patterns: Array.from(patternMap.values()),
  };
}
