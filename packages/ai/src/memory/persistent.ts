import type {
  ImportanceLevel,
  PersistentMemoryEntry,
  PersistentMemorySearchOptions,
  PersistentMemorySearchResult,
} from "@openbeam/types/ai";
import type { EmbeddingProvider, VectorStore } from "./long-term";
import { computeKeywordScore, extractQueryTerms } from "./search";

export interface PersistentMemoryStoreOptions {
  embeddingProvider: EmbeddingProvider;
  vectorStore: VectorStore;
  teamId: string;
}

export interface PersistentMemory {
  store(params: {
    content: string;
    tags?: string[];
    source?: string;
    importance?: ImportanceLevel;
  }): Promise<string>;

  recall(
    options: PersistentMemorySearchOptions
  ): Promise<PersistentMemorySearchResult[]>;

  update(
    id: string,
    updates: Partial<
      Pick<PersistentMemoryEntry, "content" | "tags" | "importance">
    >
  ): Promise<boolean>;

  forget(id: string): Promise<boolean>;

  forgetByQuery(params: {
    query?: string;
    tags?: string[];
    limit?: number;
  }): Promise<number>;

  get(id: string): Promise<PersistentMemoryEntry | null>;

  list(options?: {
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<PersistentMemoryEntry[]>;

  count(): Promise<number>;
}

const PERSISTENT_KEY_PREFIX = "pm_";
const DEFAULT_SEMANTIC_WEIGHT = 0.7;
const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_MIN_RELEVANCE = 0.3;

export class PersistentMemoryStoreImpl implements PersistentMemory {
  private readonly embeddingProvider: EmbeddingProvider;
  private readonly vectorStore: VectorStore;
  private readonly teamId: string;
  private entryCounter = 0;

  constructor(options: PersistentMemoryStoreOptions) {
    this.embeddingProvider = options.embeddingProvider;
    this.vectorStore = options.vectorStore;
    this.teamId = options.teamId;
  }

  async store(params: {
    content: string;
    tags?: string[];
    source?: string;
    importance?: ImportanceLevel;
  }): Promise<string> {
    this.entryCounter += 1;
    const id = `${PERSISTENT_KEY_PREFIX}${this.teamId}_${Date.now()}_${this.entryCounter}`;
    const now = Date.now();

    const embedding = await this.embeddingProvider.embed(params.content);

    const entry: PersistentMemoryEntry = {
      id,
      teamId: this.teamId,
      content: params.content,
      tags: params.tags ?? [],
      source: params.source ?? "agent",
      importance: params.importance ?? "medium",
      embedding,
      createdAt: now,
      updatedAt: now,
      accessedAt: now,
      accessCount: 0,
    };

    await this.vectorStore.insert(id, embedding, this.serializeMetadata(entry));

    return id;
  }

  async recall(
    options: PersistentMemorySearchOptions
  ): Promise<PersistentMemorySearchResult[]> {
    const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
    const minRelevance = options.minRelevance ?? DEFAULT_MIN_RELEVANCE;
    const semanticWeight = options.semanticWeight ?? DEFAULT_SEMANTIC_WEIGHT;

    const queryEmbedding = await this.embeddingProvider.embed(options.query);
    const candidateCount = limit * 3;

    const vectorResults = await this.vectorStore.search(
      queryEmbedding,
      candidateCount,
      { teamId: this.teamId }
    );

    const queryTerms = extractQueryTerms(options.query);

    const scored: PersistentMemorySearchResult[] = [];

    for (const result of vectorResults) {
      const entry = this.deserializeEntry(result.id, result.metadata);

      if (options.tags?.length) {
        const hasMatchingTag = options.tags.some((t: string) =>
          entry.tags.includes(t)
        );
        if (!hasMatchingTag) {
          continue;
        }
      }

      if (options.dateRange) {
        if (
          options.dateRange.start &&
          entry.createdAt < options.dateRange.start
        ) {
          continue;
        }
        if (options.dateRange.end && entry.createdAt > options.dateRange.end) {
          continue;
        }
      }

      const semanticScore = result.score;
      const keywordScore = computeKeywordScore(entry.content, queryTerms);
      const keywordWeight = 1 - semanticWeight;
      const combinedScore =
        semanticWeight * Math.max(0, semanticScore) +
        keywordWeight * keywordScore;

      if (combinedScore < minRelevance) {
        continue;
      }

      let matchType: "semantic" | "keyword" | "hybrid" = "hybrid";
      if (semanticScore > keywordScore) {
        matchType = "semantic";
      } else if (keywordScore > semanticScore) {
        matchType = "keyword";
      }

      scored.push({
        entry,
        relevanceScore: combinedScore,
        matchType,
      });
    }

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const topResults = scored.slice(0, limit);

    for (const result of topResults) {
      await this.touchAccess(result.entry.id);
    }

    return topResults;
  }

  async update(
    id: string,
    updates: Partial<
      Pick<PersistentMemoryEntry, "content" | "tags" | "importance">
    >
  ): Promise<boolean> {
    const doc = await this.vectorStore.get(id);
    if (!doc) {
      return false;
    }

    const entry = this.deserializeEntry(id, doc.metadata);
    if (entry.teamId !== this.teamId) {
      return false;
    }

    const updated: PersistentMemoryEntry = {
      ...entry,
      ...updates,
      updatedAt: Date.now(),
    };

    if (updates.content) {
      const newEmbedding = await this.embeddingProvider.embed(updates.content);
      await this.vectorStore.delete(id);
      await this.vectorStore.insert(
        id,
        newEmbedding,
        this.serializeMetadata(updated)
      );
    } else {
      await this.vectorStore.delete(id);
      await this.vectorStore.insert(
        id,
        doc.vector,
        this.serializeMetadata(updated)
      );
    }

    return true;
  }

  async forget(id: string): Promise<boolean> {
    const doc = await this.vectorStore.get(id);
    if (!doc) {
      return false;
    }

    const entry = this.deserializeEntry(id, doc.metadata);
    if (entry.teamId !== this.teamId) {
      return false;
    }

    await this.vectorStore.delete(id);
    return true;
  }

  async forgetByQuery(params: {
    query?: string;
    tags?: string[];
    limit?: number;
  }): Promise<number> {
    let idsToDelete: string[] = [];

    if (params.query) {
      const results = await this.recall({
        query: params.query,
        teamId: this.teamId,
        limit: params.limit ?? 50,
        minRelevance: 0.5,
      });
      idsToDelete = results.map((r) => r.entry.id);
    }

    if (params.tags?.length && !params.query) {
      const all = await this.list({
        tags: params.tags,
        limit: params.limit ?? 50,
      });
      idsToDelete = all.map((e) => e.id);
    }

    let deleted = 0;
    for (const id of idsToDelete) {
      const success = await this.forget(id);
      if (success) {
        deleted += 1;
      }
    }

    return deleted;
  }

  async get(id: string): Promise<PersistentMemoryEntry | null> {
    const doc = await this.vectorStore.get(id);
    if (!doc) {
      return null;
    }

    const entry = this.deserializeEntry(id, doc.metadata);
    if (entry.teamId !== this.teamId) {
      return null;
    }

    return entry;
  }

  async list(options?: {
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<PersistentMemoryEntry[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const docs = await this.vectorStore.list(limit + offset, 0, {
      teamId: this.teamId,
    });

    let entries = docs.map((doc) =>
      this.deserializeEntry(doc.id, doc.metadata)
    );

    if (options?.tags?.length) {
      entries = entries.filter((e) =>
        options.tags?.some((t) => e.tags.includes(t))
      );
    }

    return entries.slice(offset, offset + limit);
  }

  count(): Promise<number> {
    return this.vectorStore.count({ teamId: this.teamId });
  }

  private async touchAccess(id: string): Promise<void> {
    const doc = await this.vectorStore.get(id);
    if (!doc) {
      return;
    }

    const entry = this.deserializeEntry(id, doc.metadata);
    entry.accessedAt = Date.now();
    entry.accessCount += 1;

    await this.vectorStore.delete(id);
    await this.vectorStore.insert(
      id,
      doc.vector,
      this.serializeMetadata(entry)
    );
  }

  private serializeMetadata(
    entry: PersistentMemoryEntry
  ): Record<string, unknown> {
    return {
      teamId: entry.teamId,
      content: entry.content,
      tags: JSON.stringify(entry.tags),
      source: entry.source,
      importance: entry.importance,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    };
  }

  private deserializeEntry(
    id: string,
    metadata: Record<string, unknown>
  ): PersistentMemoryEntry {
    const rawTags = metadata.tags;
    let tags: string[] = [];
    if (typeof rawTags === "string") {
      tags = JSON.parse(rawTags) as string[];
    } else if (Array.isArray(rawTags)) {
      tags = rawTags as string[];
    }

    return {
      id,
      teamId: metadata.teamId as string,
      content: metadata.content as string,
      tags,
      source: (metadata.source as string) ?? "agent",
      importance: (metadata.importance as ImportanceLevel) ?? "medium",
      createdAt: metadata.createdAt as number,
      updatedAt: metadata.updatedAt as number,
      accessedAt: metadata.accessedAt as number,
      accessCount: (metadata.accessCount as number) ?? 0,
    };
  }
}

export function createPersistentMemory(
  options: PersistentMemoryStoreOptions
): PersistentMemory {
  return new PersistentMemoryStoreImpl(options);
}
