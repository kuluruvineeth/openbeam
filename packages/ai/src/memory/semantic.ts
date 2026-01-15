import type {
  MemoryMetadata,
  MemoryQuery,
  MemoryRetrievalResult,
  MemoryStoreOptions,
  ScoredMemoryEntry,
  SemanticEntry,
} from "@openplane/types/ai";
import type { MemoryStore } from "./types";
import { DEFAULT_MEMORY_OPTIONS } from "./types";

export interface SemanticMemoryOptions extends MemoryStoreOptions {
  minConfidence?: number;
  categoryWeights?: Record<string, number>;
}

const DEFAULT_MIN_CONFIDENCE = 0.5;
const WHITESPACE_REGEX = /\s+/;

export class SemanticMemory implements MemoryStore {
  private readonly entries = new Map<string, SemanticEntry>();
  private readonly categoryIndex = new Map<string, Set<string>>();
  private readonly sourceIndex = new Map<string, Set<string>>();
  private readonly options: Required<SemanticMemoryOptions>;
  private entryCounter = 0;

  constructor(options: SemanticMemoryOptions = {}) {
    this.options = {
      ...DEFAULT_MEMORY_OPTIONS,
      minConfidence: options.minConfidence ?? DEFAULT_MIN_CONFIDENCE,
      categoryWeights: options.categoryWeights ?? {},
      ...options,
    };
  }

  async store(
    entry: Omit<
      SemanticEntry,
      "id" | "accessCount" | "lastAccessedAt" | "decayFactor"
    >
  ): Promise<string> {
    if (entry.confidence < this.options.minConfidence) {
      throw new Error(
        `Confidence ${entry.confidence} below minimum ${this.options.minConfidence}`
      );
    }

    const existingId = this.findDuplicate(entry);
    if (existingId) {
      await this.mergeKnowledge(existingId, entry);
      return existingId;
    }

    this.entryCounter += 1;
    const id = `sem_${this.entryCounter}_${Date.now()}`;

    const fullEntry: SemanticEntry = {
      ...entry,
      id,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      decayFactor: 1.0,
    };

    this.entries.set(id, fullEntry);
    this.indexEntry(fullEntry);

    if (this.entries.size > this.options.maxEntries) {
      await this.pruneLowestConfidence();
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

      if (entry.validUntil && entry.validUntil < Date.now()) {
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

  async get(id: string): Promise<SemanticEntry | null> {
    const entry = this.entries.get(id);
    if (entry) {
      await this.recordAccess(id);
    }
    return entry ?? null;
  }

  update(id: string, updates: Partial<SemanticEntry>): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    const oldCategory = entry.category;
    const updatedEntry = { ...entry, ...updates, id };

    this.entries.set(id, updatedEntry);

    if (updates.category && updates.category !== oldCategory) {
      this.categoryIndex.get(oldCategory)?.delete(id);
      const categoryEntries =
        this.categoryIndex.get(updates.category) ?? new Set();
      categoryEntries.add(id);
      this.categoryIndex.set(updates.category, categoryEntries);
    }
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    this.entries.delete(id);
    this.categoryIndex.get(entry.category)?.delete(id);

    for (const source of entry.sources) {
      this.sourceIndex.get(source)?.delete(id);
    }
    return Promise.resolve();
  }

  async clear(filter?: Partial<MemoryMetadata>): Promise<number> {
    if (!filter) {
      const count = this.entries.size;
      this.entries.clear();
      this.categoryIndex.clear();
      this.sourceIndex.clear();
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

  getByCategory(category: string): Promise<SemanticEntry[]> {
    const entryIds = this.categoryIndex.get(category);
    if (!entryIds) {
      return Promise.resolve([]);
    }

    const entries: SemanticEntry[] = [];
    for (const id of entryIds) {
      const entry = this.entries.get(id);
      if (entry && (!entry.validUntil || entry.validUntil >= Date.now())) {
        entries.push(entry);
      }
    }

    return Promise.resolve(entries.sort((a, b) => b.confidence - a.confidence));
  }

  getBySource(source: string): Promise<SemanticEntry[]> {
    const entryIds = this.sourceIndex.get(source);
    if (!entryIds) {
      return Promise.resolve([]);
    }

    const entries: SemanticEntry[] = [];
    for (const id of entryIds) {
      const entry = this.entries.get(id);
      if (entry) {
        entries.push(entry);
      }
    }

    return Promise.resolve(entries);
  }

  findRelated(entryId: string, limit = 5): Promise<ScoredMemoryEntry[]> {
    const targetEntry = this.entries.get(entryId);
    if (!targetEntry) {
      return Promise.resolve([]);
    }

    const candidates: ScoredMemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.id === entryId) {
        continue;
      }

      const relatednessScore = this.calculateRelatedness(targetEntry, entry);
      if (relatednessScore > 0.1) {
        candidates.push({
          entry,
          relevanceScore: relatednessScore,
          recencyScore: this.calculateRecency(entry),
          importanceScore: entry.confidence,
          combinedScore: relatednessScore * 0.6 + entry.confidence * 0.4,
        });
      }
    }

    candidates.sort((a, b) => b.combinedScore - a.combinedScore);
    return Promise.resolve(candidates.slice(0, limit));
  }

  async updateConfidence(id: string, delta: number): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return;
    }

    entry.confidence = Math.max(0, Math.min(1, entry.confidence + delta));

    if (entry.confidence < this.options.minConfidence) {
      await this.delete(id);
    }
  }

  async expireStale(): Promise<number> {
    const now = Date.now();
    let expired = 0;

    for (const [id, entry] of this.entries) {
      if (entry.validUntil && entry.validUntil < now) {
        await this.delete(id);
        expired += 1;
      }
    }

    return expired;
  }

  private indexEntry(entry: SemanticEntry): void {
    const categoryEntries = this.categoryIndex.get(entry.category) ?? new Set();
    categoryEntries.add(entry.id);
    this.categoryIndex.set(entry.category, categoryEntries);

    for (const source of entry.sources) {
      const sourceEntries = this.sourceIndex.get(source) ?? new Set();
      sourceEntries.add(entry.id);
      this.sourceIndex.set(source, sourceEntries);
    }
  }

  private findDuplicate(
    entry: Omit<
      SemanticEntry,
      "id" | "accessCount" | "lastAccessedAt" | "decayFactor"
    >
  ): string | undefined {
    const categoryEntries = this.categoryIndex.get(entry.category);
    if (!categoryEntries) {
      return;
    }

    for (const id of categoryEntries) {
      const existing = this.entries.get(id);
      if (!existing) {
        continue;
      }

      if (existing.metadata.teamId !== entry.metadata.teamId) {
        continue;
      }

      const similarity = this.calculateTextSimilarity(
        existing.content,
        entry.content
      );

      if (similarity > 0.9) {
        return id;
      }
    }

    return;
  }

  private mergeKnowledge(
    existingId: string,
    newEntry: Omit<
      SemanticEntry,
      "id" | "accessCount" | "lastAccessedAt" | "decayFactor"
    >
  ): Promise<void> {
    const existing = this.entries.get(existingId);
    if (!existing) {
      return Promise.resolve();
    }

    const mergedSources = [
      ...new Set([...existing.sources, ...newEntry.sources]),
    ];
    const mergedConfidence = Math.min(
      1,
      existing.confidence +
        (1 - existing.confidence) * newEntry.confidence * 0.3
    );

    existing.sources = mergedSources;
    existing.confidence = mergedConfidence;
    existing.timestamp = Math.max(existing.timestamp, newEntry.timestamp);
    existing.lastAccessedAt = Date.now();

    if (newEntry.validUntil) {
      existing.validUntil = existing.validUntil
        ? Math.max(existing.validUntil, newEntry.validUntil)
        : newEntry.validUntil;
    }

    for (const source of newEntry.sources) {
      const sourceEntries = this.sourceIndex.get(source) ?? new Set();
      sourceEntries.add(existingId);
      this.sourceIndex.set(source, sourceEntries);
    }
    return Promise.resolve();
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Filter matching requires multiple checks
  private matchesFilter(entry: SemanticEntry, query: MemoryQuery): boolean {
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
    entry: SemanticEntry,
    query: MemoryQuery
  ): Omit<ScoredMemoryEntry, "entry"> {
    const relevanceScore = this.calculateRelevance(entry, query);
    const recencyScore = this.calculateRecency(entry);
    const importanceScore = entry.confidence;
    const categoryWeight = this.options.categoryWeights[entry.category] ?? 1.0;

    const combinedScore =
      (relevanceScore * 0.4 + importanceScore * 0.4 + recencyScore * 0.2) *
      categoryWeight *
      entry.decayFactor;

    return {
      relevanceScore,
      recencyScore,
      importanceScore,
      combinedScore,
    };
  }

  private calculateRelevance(entry: SemanticEntry, query: MemoryQuery): number {
    return this.calculateTextSimilarity(query.query, entry.content);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const terms1 = new Set(text1.toLowerCase().split(WHITESPACE_REGEX));
    const terms2 = new Set(text2.toLowerCase().split(WHITESPACE_REGEX));

    let intersection = 0;
    for (const term of terms1) {
      if (terms2.has(term)) {
        intersection += 1;
      }
    }

    const union = terms1.size + terms2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private calculateRelatedness(a: SemanticEntry, b: SemanticEntry): number {
    let score = 0;

    if (a.category === b.category) {
      score += 0.3;
    }

    const sharedSources = a.sources.filter((s) => b.sources.includes(s));
    score += Math.min(0.3, sharedSources.length * 0.1);

    const sharedTags = (a.metadata.tags ?? []).filter((t) =>
      (b.metadata.tags ?? []).includes(t)
    );
    score += Math.min(0.2, sharedTags.length * 0.05);

    const contentSimilarity = this.calculateTextSimilarity(
      a.content,
      b.content
    );
    score += contentSimilarity * 0.2;

    return Math.min(1, score);
  }

  private calculateRecency(entry: SemanticEntry): number {
    const age = Date.now() - entry.timestamp;
    const halfLife = 30 * 24 * 60 * 60 * 1000;
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

  private async pruneLowestConfidence(): Promise<void> {
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) => {
      const scoreA = a.confidence * a.decayFactor;
      const scoreB = b.confidence * b.decayFactor;
      return scoreA - scoreB;
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

export function createSemanticMemory(
  options?: SemanticMemoryOptions
): SemanticMemory {
  return new SemanticMemory(options);
}
