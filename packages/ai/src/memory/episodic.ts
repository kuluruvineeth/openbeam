import type {
  EpisodicEntry,
  MemoryMetadata,
  MemoryQuery,
  MemoryRetrievalResult,
  MemoryStore,
  MemoryStoreOptions,
  ScoredMemoryEntry,
} from "./types";
import { DEFAULT_MEMORY_OPTIONS } from "./types";

export interface EpisodicMemoryOptions extends MemoryStoreOptions {
  sessionWindowMs?: number;
  maxTurnsPerSession?: number;
}

const DEFAULT_SESSION_WINDOW_MS = 30 * 60 * 1000;
const DEFAULT_MAX_TURNS = 100;
const WHITESPACE_REGEX = /\s+/;

export class EpisodicMemory implements MemoryStore {
  private readonly entries = new Map<string, EpisodicEntry>();
  private readonly sessionIndex = new Map<string, Set<string>>();
  private readonly options: Required<EpisodicMemoryOptions>;
  private entryCounter = 0;

  constructor(options: EpisodicMemoryOptions = {}) {
    this.options = {
      ...DEFAULT_MEMORY_OPTIONS,
      sessionWindowMs: options.sessionWindowMs ?? DEFAULT_SESSION_WINDOW_MS,
      maxTurnsPerSession: options.maxTurnsPerSession ?? DEFAULT_MAX_TURNS,
      ...options,
    };
  }

  async store(
    entry: Omit<
      EpisodicEntry,
      "id" | "accessCount" | "lastAccessedAt" | "decayFactor"
    >
  ): Promise<string> {
    this.entryCounter += 1;
    const id = `ep_${this.entryCounter}_${Date.now()}`;

    const fullEntry: EpisodicEntry = {
      ...entry,
      id,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      decayFactor: 1.0,
    };

    this.entries.set(id, fullEntry);

    if (entry.metadata.sessionId) {
      const sessionEntries =
        this.sessionIndex.get(entry.metadata.sessionId) ?? new Set();
      sessionEntries.add(id);
      this.sessionIndex.set(entry.metadata.sessionId, sessionEntries);

      if (sessionEntries.size > this.options.maxTurnsPerSession) {
        await this.pruneSession(entry.metadata.sessionId);
      }
    }

    if (this.entries.size > this.options.maxEntries) {
      await this.pruneOldest();
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

  async get(id: string): Promise<EpisodicEntry | null> {
    const entry = this.entries.get(id);
    if (entry) {
      await this.recordAccess(id);
    }
    return entry ?? null;
  }

  update(id: string, updates: Partial<EpisodicEntry>): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    this.entries.set(id, { ...entry, ...updates, id });
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return Promise.resolve();
    }

    this.entries.delete(id);

    if (entry.metadata.sessionId) {
      const sessionEntries = this.sessionIndex.get(entry.metadata.sessionId);
      sessionEntries?.delete(id);
    }
    return Promise.resolve();
  }

  async clear(filter?: Partial<MemoryMetadata>): Promise<number> {
    if (!filter) {
      const count = this.entries.size;
      this.entries.clear();
      this.sessionIndex.clear();
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

  getSessionHistory(sessionId: string): Promise<EpisodicEntry[]> {
    const entryIds = this.sessionIndex.get(sessionId);
    if (!entryIds) {
      return Promise.resolve([]);
    }

    const entries: EpisodicEntry[] = [];
    for (const id of entryIds) {
      const entry = this.entries.get(id);
      if (entry) {
        entries.push(entry);
      }
    }

    return Promise.resolve(entries.sort((a, b) => a.timestamp - b.timestamp));
  }

  async getRecentConversation(
    sessionId: string,
    maxTurns = 10
  ): Promise<string> {
    const history = await this.getSessionHistory(sessionId);
    const recent = history.slice(-maxTurns);

    return recent
      .map((entry) => {
        const role = entry.eventType === "query" ? "User" : "Assistant";
        return `${role}: ${entry.content}`;
      })
      .join("\n\n");
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Filter matching requires multiple checks
  private matchesFilter(entry: EpisodicEntry, query: MemoryQuery): boolean {
    if (entry.metadata.teamId !== query.teamId) {
      return false;
    }

    if (query.userId && entry.metadata.userId !== query.userId) {
      return false;
    }

    if (query.sessionId && entry.metadata.sessionId !== query.sessionId) {
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
    entry: EpisodicEntry,
    query: MemoryQuery
  ): Omit<ScoredMemoryEntry, "entry"> {
    const relevanceScore = this.calculateRelevance(entry, query);
    const recencyScore = this.calculateRecency(entry);
    const importanceScore = entry.metadata.importance ?? 0.5;

    const combinedScore =
      relevanceScore * 0.5 + recencyScore * 0.3 + importanceScore * 0.2;

    return {
      relevanceScore,
      recencyScore,
      importanceScore,
      combinedScore: combinedScore * entry.decayFactor,
    };
  }

  private calculateRelevance(entry: EpisodicEntry, query: MemoryQuery): number {
    const queryTerms = query.query.toLowerCase().split(WHITESPACE_REGEX);
    const contentTerms = entry.content.toLowerCase().split(WHITESPACE_REGEX);

    let matches = 0;
    for (const term of queryTerms) {
      if (contentTerms.some((ct) => ct.includes(term))) {
        matches += 1;
      }
    }

    return queryTerms.length > 0 ? matches / queryTerms.length : 0;
  }

  private calculateRecency(entry: EpisodicEntry): number {
    const age = Date.now() - entry.timestamp;
    const halfLife = this.options.sessionWindowMs;
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

  private async pruneSession(sessionId: string): Promise<void> {
    const entryIds = this.sessionIndex.get(sessionId);
    if (!entryIds || entryIds.size <= this.options.maxTurnsPerSession) {
      return;
    }

    const entries: EpisodicEntry[] = [];
    for (const id of entryIds) {
      const entry = this.entries.get(id);
      if (entry) {
        entries.push(entry);
      }
    }

    entries.sort((a, b) => a.timestamp - b.timestamp);

    const toRemove = entries.length - this.options.maxTurnsPerSession;
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        await this.delete(entry.id);
      }
    }
  }

  private async pruneOldest(): Promise<void> {
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) => {
      const scoreA = a.decayFactor * (a.accessCount + 1);
      const scoreB = b.decayFactor * (b.accessCount + 1);
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

export function createEpisodicMemory(
  options?: EpisodicMemoryOptions
): EpisodicMemory {
  return new EpisodicMemory(options);
}
