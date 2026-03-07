import type { EpisodicEntry, SemanticEntry } from "@openbeam/types/ai";
import type { MemoryConsolidator } from "./consolidator";

const ORIGINAL_PATTERN = /When asked about "([^"]+)"/;
const CORRECTED_PATTERN = /the correct answer is: (.+)$/;
const PREFERENCE_PATTERN = /User preference: (\w+) = (.+)/;

export type MemorySignalType =
  | "search_executed"
  | "document_viewed"
  | "result_clicked"
  | "result_ignored"
  | "correction_made"
  | "preference_expressed"
  | "feedback_positive"
  | "feedback_negative"
  | "workflow_started"
  | "workflow_completed"
  | "tool_succeeded"
  | "tool_failed";

export type MemorySignalImportance = "low" | "medium" | "high" | "critical";

export interface MemorySignal {
  type: MemorySignalType;
  data: Record<string, unknown>;
  importance?: MemorySignalImportance;
  timestamp?: Date;
}

export interface UserPreferences {
  preferredSources?: string[];
  excludedSources?: string[];
  responseStyle?: "concise" | "detailed" | "technical" | "casual";
  citationStyle?: "inline" | "footnote" | "none";
  timezone?: string;
  language?: string;
  searchDefaults?: {
    limit?: number;
    connectorTypes?: string[];
    dateRange?: "week" | "month" | "quarter" | "year" | "all";
  };
  [key: string]: unknown;
}

export interface HistoryItem {
  type: "search" | "view" | "click" | "interaction";
  query?: string;
  documentId?: string;
  documentTitle?: string;
  connectorType?: string;
  timestamp: Date;
  success?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Correction {
  id: string;
  original: string;
  corrected: string;
  context: string;
  topic?: string;
  confidence: number;
  timestamp: Date;
}

export interface LearnedFact {
  id: string;
  topic: string;
  fact: string;
  confidence: number;
  sources: string[];
  validUntil?: Date;
  timestamp: Date;
}

export interface SourceFrequency {
  connectorType: string;
  sourceName?: string;
  frequency: number;
  successRate: number;
  lastAccessed: Date;
}

export interface ProceduralSuggestion {
  trigger: string;
  action: string;
  confidence: number;
  executionCount: number;
  successRate: number;
}

export interface MemoryAccess {
  readonly preferences: UserPreferences;

  getRelevantHistory(
    query: string,
    options?: { limit?: number }
  ): HistoryItem[];

  getCorrections(topic: string): Correction[];

  getLearnedFacts(topic: string): LearnedFact[];

  getFrequentSources(options?: { limit?: number }): SourceFrequency[];

  getProceduralSuggestion(trigger: string): ProceduralSuggestion | null;

  signal(observation: MemorySignal): void;

  signalSearch(query: string, resultCount: number, latencyMs: number): void;

  signalDocumentView(documentId: string, documentTitle: string): void;

  signalResultClick(documentId: string, position: number, query: string): void;

  signalCorrection(original: string, corrected: string, context: string): void;

  signalPreference(key: string, value: unknown): void;

  signalFeedback(positive: boolean, context?: string): void;
}

interface PreloadedMemory {
  preferences: UserPreferences;
  recentHistory: HistoryItem[];
  corrections: Correction[];
  facts: LearnedFact[];
  sourceFrequencies: SourceFrequency[];
}

export class MemoryAccessImpl implements MemoryAccess {
  private readonly consolidator: MemoryConsolidator;
  private readonly teamId: string;
  private readonly userId: string;
  private readonly signals: MemorySignal[] = [];
  private readonly preloaded: PreloadedMemory;

  readonly preferences: UserPreferences;

  constructor(
    consolidator: MemoryConsolidator,
    teamId: string,
    userId: string,
    preloaded: PreloadedMemory
  ) {
    this.consolidator = consolidator;
    this.teamId = teamId;
    this.userId = userId;
    this.preloaded = preloaded;
    this.preferences = preloaded.preferences;
  }

  getRelevantHistory(
    query: string,
    options?: { limit?: number }
  ): HistoryItem[] {
    const limit = options?.limit ?? 20;
    const queryLower = query.toLowerCase();

    const relevant = this.preloaded.recentHistory.filter((item) => {
      if (item.query?.toLowerCase().includes(queryLower)) {
        return true;
      }
      if (item.documentTitle?.toLowerCase().includes(queryLower)) {
        return true;
      }
      return false;
    });

    if (relevant.length >= limit) {
      return relevant.slice(0, limit);
    }

    const remaining = this.preloaded.recentHistory
      .filter((item) => !relevant.includes(item))
      .slice(0, limit - relevant.length);

    return [...relevant, ...remaining];
  }

  getCorrections(topic: string): Correction[] {
    const topicLower = topic.toLowerCase();

    return this.preloaded.corrections.filter((c) => {
      if (c.topic?.toLowerCase().includes(topicLower)) {
        return true;
      }
      if (c.context.toLowerCase().includes(topicLower)) {
        return true;
      }
      if (c.original.toLowerCase().includes(topicLower)) {
        return true;
      }
      return false;
    });
  }

  getLearnedFacts(topic: string): LearnedFact[] {
    const topicLower = topic.toLowerCase();
    const now = new Date();

    return this.preloaded.facts.filter((f) => {
      if (f.validUntil && f.validUntil < now) {
        return false;
      }
      if (f.topic.toLowerCase().includes(topicLower)) {
        return true;
      }
      if (f.fact.toLowerCase().includes(topicLower)) {
        return true;
      }
      return false;
    });
  }

  getFrequentSources(options?: { limit?: number }): SourceFrequency[] {
    const limit = options?.limit ?? 10;
    return this.preloaded.sourceFrequencies
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  getProceduralSuggestion(trigger: string): ProceduralSuggestion | null {
    const suggestion = this.consolidator.suggestAction(trigger, this.teamId);

    if (!suggestion) {
      return null;
    }

    return suggestion.then((s) =>
      s
        ? {
            trigger,
            action: s.action,
            confidence: s.confidence,
            executionCount: 0,
            successRate: s.confidence,
          }
        : null
    ) as unknown as ProceduralSuggestion | null;
  }

  signal(observation: MemorySignal): void {
    this.signals.push({
      ...observation,
      timestamp: observation.timestamp ?? new Date(),
    });
  }

  signalSearch(query: string, resultCount: number, latencyMs: number): void {
    this.signal({
      type: "search_executed",
      data: { query, resultCount, latencyMs },
      importance: "medium",
    });
  }

  signalDocumentView(documentId: string, documentTitle: string): void {
    this.signal({
      type: "document_viewed",
      data: { documentId, documentTitle },
      importance: "medium",
    });
  }

  signalResultClick(documentId: string, position: number, query: string): void {
    this.signal({
      type: "result_clicked",
      data: { documentId, position, query },
      importance: "high",
    });
  }

  signalCorrection(original: string, corrected: string, context: string): void {
    this.signal({
      type: "correction_made",
      data: { original, corrected, context },
      importance: "critical",
    });
  }

  signalPreference(key: string, value: unknown): void {
    this.signal({
      type: "preference_expressed",
      data: { key, value },
      importance: "high",
    });
  }

  signalFeedback(positive: boolean, context?: string): void {
    this.signal({
      type: positive ? "feedback_positive" : "feedback_negative",
      data: { positive, context },
      importance: "high",
    });
  }

  getCollectedSignals(): MemorySignal[] {
    return [...this.signals];
  }

  clearSignals(): void {
    this.signals.length = 0;
  }

  async processSignals(): Promise<{
    processed: number;
    stored: number;
  }> {
    const signals = this.getCollectedSignals();
    let stored = 0;

    for (const signal of signals) {
      try {
        await this.storeSignal(signal);
        stored += 1;
      } catch {
        // Signal storage is best-effort
      }
    }

    this.clearSignals();

    return { processed: signals.length, stored };
  }

  private async storeSignal(signal: MemorySignal): Promise<void> {
    switch (signal.type) {
      case "search_executed":
        await this.consolidator.storeConversationTurn(
          signal.data.query as string,
          `Found ${signal.data.resultCount} results`,
          {
            teamId: this.teamId,
            userId: this.userId,
            sessionId: `signal_${Date.now()}`,
            turnNumber: 0,
          }
        );
        break;

      case "correction_made":
        await this.consolidator.learnFact(
          `When asked about "${signal.data.original}", the correct answer is: ${signal.data.corrected}`,
          "correction",
          [`user:${this.userId}`],
          {
            teamId: this.teamId,
            userId: this.userId,
            confidence: 0.95,
          }
        );
        break;

      case "preference_expressed":
        await this.consolidator.learnFact(
          `User preference: ${signal.data.key} = ${JSON.stringify(signal.data.value)}`,
          "preference",
          [`user:${this.userId}`],
          {
            teamId: this.teamId,
            userId: this.userId,
            confidence: 1.0,
          }
        );
        break;

      default:
        await this.consolidator.storeConversationTurn(
          JSON.stringify(signal.data),
          signal.type,
          {
            teamId: this.teamId,
            userId: this.userId,
            sessionId: `signal_${Date.now()}`,
            turnNumber: 0,
          }
        );
    }
  }
}

export async function createMemoryAccess(
  consolidator: MemoryConsolidator,
  teamId: string,
  userId: string,
  options?: {
    historyLimit?: number;
    factsLimit?: number;
  }
): Promise<MemoryAccess> {
  const historyLimit = options?.historyLimit ?? 50;
  const factsLimit = options?.factsLimit ?? 100;

  const [historyResult, factsResult] = await Promise.all([
    consolidator.retrieve({
      query: "",
      teamId,
      userId,
      types: ["episodic"],
      limit: historyLimit,
    }),
    consolidator.retrieve({
      query: "",
      teamId,
      userId,
      types: ["semantic"],
      limit: factsLimit,
    }),
  ]);

  const recentHistory: HistoryItem[] = historyResult.episodic.map((e) => {
    const entry = e.entry as EpisodicEntry;
    return {
      type: mapEventTypeToHistoryType(entry.eventType),
      query: entry.eventType === "query" ? entry.content : undefined,
      timestamp: new Date(entry.timestamp),
      metadata: entry.metadata as unknown as
        | Record<string, unknown>
        | undefined,
    };
  });

  const corrections: Correction[] = [];
  const facts: LearnedFact[] = [];
  const preferenceEntries: SemanticEntry[] = [];

  for (const e of factsResult.semantic) {
    const entry = e.entry as SemanticEntry;
    if (entry.category === "correction") {
      corrections.push({
        id: entry.id,
        original: extractOriginal(entry.content),
        corrected: extractCorrected(entry.content),
        context: entry.content,
        confidence: entry.confidence,
        timestamp: new Date(entry.timestamp),
      });
    } else if (entry.category === "preference") {
      preferenceEntries.push(entry);
    } else {
      facts.push({
        id: entry.id,
        topic: entry.category,
        fact: entry.content,
        confidence: entry.confidence,
        sources: entry.sources,
        validUntil: entry.validUntil ? new Date(entry.validUntil) : undefined,
        timestamp: new Date(entry.timestamp),
      });
    }
  }

  const preferences = buildPreferencesFromEntries(preferenceEntries);

  const sourceFrequencies = aggregateSourceFrequencies(recentHistory);

  const preloaded: PreloadedMemory = {
    preferences,
    recentHistory,
    corrections,
    facts,
    sourceFrequencies,
  };

  return new MemoryAccessImpl(consolidator, teamId, userId, preloaded);
}

export function createEmptyMemoryAccess(): MemoryAccess {
  const emptyPreloaded: PreloadedMemory = {
    preferences: {},
    recentHistory: [],
    corrections: [],
    facts: [],
    sourceFrequencies: [],
  };

  const noopConsolidator = {
    suggestAction: () => Promise.resolve(null),
    storeConversationTurn: () => Promise.resolve({ inputId: "", outputId: "" }),
    learnFact: () => Promise.resolve(""),
  } as unknown as MemoryConsolidator;

  return new MemoryAccessImpl(noopConsolidator, "", "", emptyPreloaded);
}

function mapEventTypeToHistoryType(
  eventType: EpisodicEntry["eventType"]
): HistoryItem["type"] {
  switch (eventType) {
    case "query":
      return "search";
    case "tool_result":
      return "interaction";
    default:
      return "interaction";
  }
}

function extractOriginal(content: string): string {
  const match = content.match(ORIGINAL_PATTERN);
  return match?.[1] ?? content;
}

function extractCorrected(content: string): string {
  const match = content.match(CORRECTED_PATTERN);
  return match?.[1] ?? content;
}

function buildPreferencesFromEntries(
  entries: SemanticEntry[]
): UserPreferences {
  const prefs: UserPreferences = {};

  for (const entry of entries) {
    const match = entry.content.match(PREFERENCE_PATTERN);
    if (match) {
      const key = match[1];
      const valueStr = match[2];
      if (key && valueStr) {
        try {
          prefs[key] = JSON.parse(valueStr);
        } catch {
          prefs[key] = valueStr;
        }
      }
    }
  }

  return prefs;
}

function aggregateSourceFrequencies(history: HistoryItem[]): SourceFrequency[] {
  const bySource = new Map<
    string,
    { count: number; successCount: number; lastAccessed: Date }
  >();

  for (const item of history) {
    if (!item.connectorType) {
      continue;
    }

    const existing = bySource.get(item.connectorType);
    if (existing) {
      existing.count += 1;
      if (item.success !== false) {
        existing.successCount += 1;
      }
      if (item.timestamp > existing.lastAccessed) {
        existing.lastAccessed = item.timestamp;
      }
    } else {
      bySource.set(item.connectorType, {
        count: 1,
        successCount: item.success !== false ? 1 : 0,
        lastAccessed: item.timestamp,
      });
    }
  }

  return Array.from(bySource.entries()).map(([connectorType, data]) => ({
    connectorType,
    frequency: data.count,
    successRate: data.count > 0 ? data.successCount / data.count : 0,
    lastAccessed: data.lastAccessed,
  }));
}
