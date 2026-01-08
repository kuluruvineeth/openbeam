export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export interface VectorStore {
  insert(
    id: string,
    vector: number[],
    metadata: Record<string, unknown>
  ): Promise<void>;
  search(
    query: number[],
    limit: number,
    filters?: Record<string, unknown>
  ): Promise<VectorSearchResult[]>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<VectorDocument | null>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface LongTermMemoryOptions {
  embeddingProvider: EmbeddingProvider;
  vectorStore: VectorStore;
  teamId: string;
}

export interface LongTermMemoryEntry {
  id: string;
  content: string;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface MemorySearchResult {
  entry: LongTermMemoryEntry;
  relevanceScore: number;
}

export interface LongTermMemory {
  store(content: string, metadata?: Record<string, unknown>): Promise<string>;
  search(query: string, limit?: number): Promise<MemorySearchResult[]>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<LongTermMemoryEntry | null>;
}

export class LongTermMemoryStore implements LongTermMemory {
  private readonly embeddingProvider: EmbeddingProvider;
  private readonly vectorStore: VectorStore;
  private readonly teamId: string;
  private entryCounter = 0;

  constructor(options: LongTermMemoryOptions) {
    this.embeddingProvider = options.embeddingProvider;
    this.vectorStore = options.vectorStore;
    this.teamId = options.teamId;
  }

  async store(
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    this.entryCounter += 1;
    const id = `ltm_${this.teamId}_${Date.now()}_${this.entryCounter}`;

    const embedding = await this.embeddingProvider.embed(content);

    const fullMetadata = {
      ...metadata,
      content,
      teamId: this.teamId,
      createdAt: Date.now(),
    };

    await this.vectorStore.insert(id, embedding, fullMetadata);

    return id;
  }

  async search(query: string, limit = 10): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.embeddingProvider.embed(query);

    const results = await this.vectorStore.search(queryEmbedding, limit, {
      teamId: this.teamId,
    });

    return results.map((r) => ({
      entry: {
        id: r.id,
        content: r.metadata.content as string,
        createdAt: r.metadata.createdAt as number,
        metadata: r.metadata,
      },
      relevanceScore: r.score,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.vectorStore.delete(id);
  }

  async get(id: string): Promise<LongTermMemoryEntry | null> {
    const doc = await this.vectorStore.get(id);
    if (!doc) {
      return null;
    }

    return {
      id: doc.id,
      content: doc.metadata.content as string,
      createdAt: doc.metadata.createdAt as number,
      metadata: doc.metadata,
    };
  }
}

export function createLongTermMemory(
  options: LongTermMemoryOptions
): LongTermMemory {
  return new LongTermMemoryStore(options);
}

export class InMemoryVectorStore implements VectorStore {
  private readonly documents = new Map<string, VectorDocument>();

  insert(
    id: string,
    vector: number[],
    metadata: Record<string, unknown>
  ): Promise<void> {
    this.documents.set(id, { id, vector, metadata });
    return Promise.resolve();
  }

  search(
    query: number[],
    limit: number,
    filters?: Record<string, unknown>
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (filters) {
        let match = true;
        for (const [key, value] of Object.entries(filters)) {
          if (doc.metadata[key] !== value) {
            match = false;
            break;
          }
        }
        if (!match) {
          continue;
        }
      }

      const score = this.cosineSimilarity(query, doc.vector);
      results.push({ id: doc.id, score, metadata: doc.metadata });
    }

    results.sort((a, b) => b.score - a.score);
    return Promise.resolve(results.slice(0, limit));
  }

  delete(id: string): Promise<void> {
    this.documents.delete(id);
    return Promise.resolve();
  }

  get(id: string): Promise<VectorDocument | null> {
    return Promise.resolve(this.documents.get(id) ?? null);
  }

  clear(): void {
    this.documents.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      magnitudeA += aVal * aVal;
      magnitudeB += bVal * bVal;
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  private readonly dimension: number;

  constructor(dimension = 384) {
    this.dimension = dimension;
  }

  embed(text: string): Promise<number[]> {
    const hash = this.simpleHash(text);
    const vector: number[] = [];

    for (let i = 0; i < this.dimension; i++) {
      vector.push(Math.sin(hash + i) * 0.5 + 0.5);
    }

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return Promise.resolve(vector.map((v) => v / magnitude));
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = Math.imul(31, hash) + char;
    }
    return Math.abs(hash);
  }
}
