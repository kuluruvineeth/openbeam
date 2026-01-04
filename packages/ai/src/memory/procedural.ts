import type {
  MemoryMetadata,
  MemoryQuery,
  MemoryRetrievalResult,
  MemoryStore,
  MemoryStoreOptions,
  ProceduralEntry,
  ScoredMemoryEntry,
} from "./types";
import { DEFAULT_MEMORY_OPTIONS } from "./types";

export interface ProceduralMemoryOptions extends MemoryStoreOptions {
  minSuccessRate?: number;
  minExecutions?: number;
  learningRate?: number;
}

const DEFAULT_MIN_SUCCESS_RATE = 0.3;
const DEFAULT_MIN_EXECUTIONS = 3;
const DEFAULT_LEARNING_RATE = 0.1;
const WHITESPACE_REGEX = /\s+/;

export class ProceduralMemory implements MemoryStore {
  private readonly entries = new Map<string, ProceduralEntry>();
  private readonly triggerIndex = new Map<string, Set<string>>();
  private readonly patternIndex = new Map<string, Set<string>>();
  private readonly options: Required<ProceduralMemoryOptions>;
  private entryCounter = 0;

  constructor(options: ProceduralMemoryOptions = {}) {
    this.options = {
      ...DEFAULT_MEMORY_OPTIONS,
      minSuccessRate: options.minSuccessRate ?? DEFAULT_MIN_SUCCESS_RATE,
      minExecutions: options.minExecutions ?? DEFAULT_MIN_EXECUTIONS,
      learningRate: options.learningRate ?? DEFAULT_LEARNING_RATE,
      ...options,
    };
  }

  async store(
    entry: Omit<
      ProceduralEntry,
      "id" | "accessCount" | "lastAccessedAt" | "decayFactor"
    >
  ): Promise<string> {
    const existingId = this.findMatchingProcedure(entry);
    if (existingId) {
      return existingId;
    }

    this.entryCounter += 1;
    const id = `proc_${this.entryCounter}_${Date.now()}`;

    const fullEntry: ProceduralEntry = {
      ...entry,
      id,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      decayFactor: 1.0,
    };

    this.entries.set(id, fullEntry);
    this.indexEntry(fullEntry);

    if (this.entries.size > this.options.maxEntries) {
      await this.pruneLowPerformers();
    }

    return id;
  }

  async retrieve(query: MemoryQuery): Promise<MemoryRetrievalResult> {
    const startTime = performance.now();
    const candidates: ScoredMemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      if (!this.matchesFilter(entry, query)) {
        continue;
      }

      const scores = this.calculateScores(entry, query);
      if (scores.combinedScore >= (query.minRelevance ?? 0)) {
        candidates.push({ entry, ...scores });
      }
    }

    candidates.sort((a, b) => b.combinedScore - a.combinedScore);

    const limit = query.limit ?? 10;
    const results = candidates.slice(0, limit);

    for (const result of results) {
      await this.recordAccess(result.entry.id);
    }

    return {
      entries: results,
      totalCount: candidates.length,
      queryTime: performance.now() - startTime,
    };
  }

  async get(id: string): Promise<ProceduralEntry | null> {
    const entry = this.entries.get(id);
    if (entry) {
      await this.recordAccess(id);
    }
    return entry ?? null;
  }

  update(id: string, updates: Partial<ProceduralEntry>): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    const oldTrigger = entry.trigger;
    const oldPattern = entry.pattern;
    const updatedEntry = { ...entry, ...updates, id };

    this.entries.set(id, updatedEntry);

    if (updates.trigger && updates.trigger !== oldTrigger) {
      this.triggerIndex.get(oldTrigger)?.delete(id);
      this.indexTrigger(id, updates.trigger);
    }

    if (updates.pattern && updates.pattern !== oldPattern) {
      this.patternIndex.get(oldPattern)?.delete(id);
      this.indexPattern(id, updates.pattern);
    }
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    this.entries.delete(id);
    this.removeFromTriggerIndex(id, entry.trigger);
    this.removeFromPatternIndex(id, entry.pattern);
    return Promise.resolve();
  }

  async clear(filter?: Partial<MemoryMetadata>): Promise<number> {
    if (!filter) {
      const count = this.entries.size;
      this.entries.clear();
      this.triggerIndex.clear();
      this.patternIndex.clear();
      return count;
    }

    let deleted = 0;
    for (const [id, entry] of this.entries) {
      if (this.matchesMetadataFilter(entry.metadata, filter)) {
        await this.delete(id);
        deleted += 1;
      }
    }

    return deleted;
  }

  count(filter?: Partial<MemoryMetadata>): Promise<number> {
    if (!filter) {
      return Promise.resolve(this.entries.size);
    }

    let count = 0;
    for (const entry of this.entries.values()) {
      if (this.matchesMetadataFilter(entry.metadata, filter)) {
        count += 1;
      }
    }

    return Promise.resolve(count);
  }

  findByTrigger(trigger: string, teamId: string): Promise<ProceduralEntry[]> {
    const matchingEntries: ProceduralEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.metadata.teamId !== teamId) {
        continue;
      }

      if (this.triggerMatches(trigger, entry.trigger)) {
        matchingEntries.push(entry);
      }
    }

    const sorted = matchingEntries.sort((a, b) => {
      const scoreA = a.successRate * Math.log(a.executionCount + 1);
      const scoreB = b.successRate * Math.log(b.executionCount + 1);
      return scoreB - scoreA;
    });
    return Promise.resolve(sorted);
  }

  findByPattern(pattern: string, teamId: string): Promise<ProceduralEntry[]> {
    const patternEntries = this.patternIndex.get(pattern);
    if (!patternEntries) {
      return Promise.resolve([]);
    }

    const entries: ProceduralEntry[] = [];
    for (const id of patternEntries) {
      const entry = this.entries.get(id);
      if (entry && entry.metadata.teamId === teamId) {
        entries.push(entry);
      }
    }

    return Promise.resolve(
      entries.sort((a, b) => b.successRate - a.successRate)
    );
  }

  async recordExecution(id: string, success: boolean): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return;
    }

    entry.executionCount += 1;
    entry.lastAccessedAt = Date.now();

    const learningRate = this.options.learningRate;
    const target = success ? 1 : 0;
    entry.successRate += learningRate * (target - entry.successRate);

    if (
      entry.executionCount >= this.options.minExecutions &&
      entry.successRate < this.options.minSuccessRate
    ) {
      await this.delete(id);
    }
  }

  reinforce(id: string, amount = 0.1): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    entry.successRate = Math.min(1, entry.successRate + amount);
    entry.lastAccessedAt = Date.now();
    return Promise.resolve();
  }

  async penalize(id: string, amount = 0.1): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return;
    }

    entry.successRate = Math.max(0, entry.successRate - amount);
    entry.lastAccessedAt = Date.now();

    if (
      entry.executionCount >= this.options.minExecutions &&
      entry.successRate < this.options.minSuccessRate
    ) {
      await this.delete(id);
    }
  }

  getMostEffective(teamId: string, limit = 10): Promise<ProceduralEntry[]> {
    const teamEntries = Array.from(this.entries.values()).filter(
      (e) =>
        e.metadata.teamId === teamId &&
        e.executionCount >= this.options.minExecutions
    );

    teamEntries.sort((a, b) => {
      const effectivenessA = a.successRate * Math.log(a.executionCount + 1);
      const effectivenessB = b.successRate * Math.log(b.executionCount + 1);
      return effectivenessB - effectivenessA;
    });

    return Promise.resolve(teamEntries.slice(0, limit));
  }

  async suggestAction(
    trigger: string,
    teamId: string
  ): Promise<{ action: string; confidence: number } | null> {
    const matching = await this.findByTrigger(trigger, teamId);

    const reliable = matching.filter(
      (e) =>
        e.executionCount >= this.options.minExecutions &&
        e.successRate >= this.options.minSuccessRate
    );

    const best = reliable[0];
    if (!best) {
      return null;
    }

    const confidence =
      best.successRate *
      Math.min(1, best.executionCount / 10) *
      best.decayFactor;

    return {
      action: best.action,
      confidence,
    };
  }

  private indexEntry(entry: ProceduralEntry): void {
    this.indexTrigger(entry.id, entry.trigger);
    this.indexPattern(entry.id, entry.pattern);
  }

  private indexTrigger(id: string, trigger: string): void {
    const keywords = this.extractKeywords(trigger);
    for (const keyword of keywords) {
      const triggerEntries = this.triggerIndex.get(keyword) ?? new Set();
      triggerEntries.add(id);
      this.triggerIndex.set(keyword, triggerEntries);
    }
  }

  private indexPattern(id: string, pattern: string): void {
    const patternEntries = this.patternIndex.get(pattern) ?? new Set();
    patternEntries.add(id);
    this.patternIndex.set(pattern, patternEntries);
  }

  private removeFromTriggerIndex(id: string, trigger: string): void {
    const keywords = this.extractKeywords(trigger);
    for (const keyword of keywords) {
      this.triggerIndex.get(keyword)?.delete(id);
    }
  }

  private removeFromPatternIndex(id: string, pattern: string): void {
    this.patternIndex.get(pattern)?.delete(id);
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(WHITESPACE_REGEX)
      .filter((word) => word.length > 2);
  }

  private findMatchingProcedure(
    entry: Omit<
      ProceduralEntry,
      "id" | "accessCount" | "lastAccessedAt" | "decayFactor"
    >
  ): string | undefined {
    for (const existing of this.entries.values()) {
      if (existing.metadata.teamId !== entry.metadata.teamId) {
        continue;
      }

      if (
        existing.trigger === entry.trigger &&
        existing.action === entry.action &&
        existing.pattern === entry.pattern
      ) {
        return existing.id;
      }
    }

    return;
  }

  private triggerMatches(input: string, trigger: string): boolean {
    const inputKeywords = new Set(this.extractKeywords(input));
    const triggerKeywords = this.extractKeywords(trigger);

    if (triggerKeywords.length === 0) {
      return false;
    }

    let matches = 0;
    for (const keyword of triggerKeywords) {
      if (inputKeywords.has(keyword)) {
        matches += 1;
      }
    }

    return matches / triggerKeywords.length >= 0.5;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Filter matching requires multiple checks
  private matchesFilter(entry: ProceduralEntry, query: MemoryQuery): boolean {
    if (entry.metadata.teamId !== query.teamId) {
      return false;
    }

    if (query.userId && entry.metadata.userId !== query.userId) {
      return false;
    }

    if (query.types && !query.types.includes(entry.type)) {
      return false;
    }

    if (query.timeRange) {
      if (query.timeRange.start && entry.timestamp < query.timeRange.start) {
        return false;
      }
      if (query.timeRange.end && entry.timestamp > query.timeRange.end) {
        return false;
      }
    }

    if (query.tags?.length) {
      const entryTags = new Set(entry.metadata.tags ?? []);
      if (!query.tags.some((tag) => entryTags.has(tag))) {
        return false;
      }
    }

    return true;
  }

  private matchesMetadataFilter(
    metadata: MemoryMetadata,
    filter: Partial<MemoryMetadata>
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (
        value !== undefined &&
        metadata[key as keyof MemoryMetadata] !== value
      ) {
        return false;
      }
    }
    return true;
  }

  private calculateScores(
    entry: ProceduralEntry,
    query: MemoryQuery
  ): Omit<ScoredMemoryEntry, "entry"> {
    const relevanceScore = this.triggerMatches(query.query, entry.trigger)
      ? 1
      : 0;
    const recencyScore = this.calculateRecency(entry);
    const importanceScore = entry.successRate;

    const executionWeight = Math.min(1, Math.log(entry.executionCount + 1) / 3);

    const combinedScore =
      (relevanceScore * 0.3 +
        importanceScore * 0.4 +
        recencyScore * 0.1 +
        executionWeight * 0.2) *
      entry.decayFactor;

    return {
      relevanceScore,
      recencyScore,
      importanceScore,
      combinedScore,
    };
  }

  private calculateRecency(entry: ProceduralEntry): number {
    const age = Date.now() - entry.lastAccessedAt;
    const halfLife = 7 * 24 * 60 * 60 * 1000;
    return Math.exp(-age / halfLife);
  }

  private recordAccess(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    entry.accessCount += 1;
    entry.lastAccessedAt = Date.now();
    return Promise.resolve();
  }

  private async pruneLowPerformers(): Promise<void> {
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) => {
      const performanceA =
        a.successRate * Math.log(a.executionCount + 1) * a.decayFactor;
      const performanceB =
        b.successRate * Math.log(b.executionCount + 1) * b.decayFactor;
      return performanceA - performanceB;
    });

    const toRemove = Math.floor(this.entries.size * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        await this.delete(entry.id);
      }
    }
  }

  applyDecay(): void {
    const now = Date.now();
    for (const entry of this.entries.values()) {
      const age = now - entry.lastAccessedAt;
      const decayMultiplier = Math.exp(
        -this.options.decayRate * (age / 86_400_000)
      );
      entry.decayFactor = Math.max(0.1, entry.decayFactor * decayMultiplier);
    }
  }
}

export function createProceduralMemory(
  options?: ProceduralMemoryOptions
): ProceduralMemory {
  return new ProceduralMemory(options);
}
