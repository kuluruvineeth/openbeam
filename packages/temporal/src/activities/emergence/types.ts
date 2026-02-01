export interface CompositionEvent {
  sessionId: string;
  teamId: string;
  userId: string;
  toolSequence: string[];
  success: boolean;
  latencyMs: number;
  promptCategory: string;
  timestamp: number;
}

export interface EmergencePattern {
  signature: string;
  toolSequence: string[];
  frequency: number;
  successRate: number;
  avgLatencyMs: number;
  firstSeen: number;
  lastSeen: number;
  status: "observed" | "validated" | "formalized" | "rejected";
  examples: PatternExample[];
}

export interface PatternExample {
  prompt: string;
  outcome: "success" | "failure";
  timestamp: number;
}

export interface LoadCompositionEventsInput {
  teamId?: string;
  startDate: number;
  endDate: number;
  limit?: number;
}

export interface LoadCompositionEventsOutput {
  events: CompositionEvent[];
  totalCount: number;
}

export interface AggregratePatternsInput {
  events: CompositionEvent[];
}

export interface AggregatePatternsOutput {
  patterns: EmergencePattern[];
}

export interface LoadExistingPatternsInput {
  teamId?: string;
  minFrequency?: number;
  minSuccessRate?: number;
  status?: "observed" | "validated";
}

export interface LoadExistingPatternsOutput {
  patterns: EmergencePattern[];
}

export interface SavePatternsInput {
  patterns: EmergencePattern[];
}

export interface SavePatternsOutput {
  savedCount: number;
  validatedCount: number;
}

export interface FindFormalizationCandidatesInput {
  patterns: EmergencePattern[];
  minFrequency: number;
  minSuccessRate: number;
}

export interface FindFormalizationCandidatesOutput {
  candidates: EmergencePattern[];
}

export interface EmergenceDetectionActivities {
  loadCompositionEvents(
    input: LoadCompositionEventsInput
  ): Promise<LoadCompositionEventsOutput>;
  aggregatePatterns(
    input: AggregratePatternsInput
  ): Promise<AggregatePatternsOutput>;
  loadExistingPatterns(
    input: LoadExistingPatternsInput
  ): Promise<LoadExistingPatternsOutput>;
  savePatterns(input: SavePatternsInput): Promise<SavePatternsOutput>;
  findFormalizationCandidates(
    input: FindFormalizationCandidatesInput
  ): Promise<FindFormalizationCandidatesOutput>;
}
