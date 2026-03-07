import type {
  MemoryConsolidatorOptions,
  MemoryEntry,
  MemoryMetadata,
  MemoryQuery,
  MemoryRetrievalResult,
  MemoryStoreOptions,
} from "@openbeam/types/ai";

export interface MemoryStore {
  store(
    entry: Omit<
      MemoryEntry,
      "id" | "accessCount" | "lastAccessedAt" | "decayFactor"
    >
  ): Promise<string>;
  retrieve(query: MemoryQuery): Promise<MemoryRetrievalResult>;
  get(id: string): Promise<MemoryEntry | null>;
  update(id: string, updates: Partial<MemoryEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(filter?: Partial<MemoryMetadata>): Promise<number>;
  count(filter?: Partial<MemoryMetadata>): Promise<number>;
}

export const DEFAULT_MEMORY_OPTIONS: Required<MemoryStoreOptions> = {
  maxEntries: 10_000,
  decayRate: 0.1,
  consolidationThreshold: 0.7,
  embeddingEnabled: true,
};

export const DEFAULT_CONSOLIDATION_OPTIONS: Required<MemoryConsolidatorOptions> =
  {
    maxTokens: 4000,
    episodicWeight: 0.4,
    semanticWeight: 0.35,
    proceduralWeight: 0.25,
    recencyBias: 0.3,
    importanceBias: 0.2,
  };
