export type MemoryType = "episodic" | "semantic" | "procedural";

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  timestamp: number;
  accessCount: number;
  lastAccessedAt: number;
  decayFactor: number;
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  teamId: string;
  userId?: string;
  sessionId?: string;
  agentId?: string;
  tags?: string[];
  source?: string;
  importance?: number;
  associations?: string[];
}

export interface EpisodicEntry extends MemoryEntry {
  type: "episodic";
  eventType: "query" | "response" | "tool_call" | "tool_result" | "error";
  conversationId?: string;
  turnNumber?: number;
  parentId?: string;
}

export interface SemanticEntry extends MemoryEntry {
  type: "semantic";
  category: string;
  confidence: number;
  sources: string[];
  validUntil?: number;
}

export interface ProceduralEntry extends MemoryEntry {
  type: "procedural";
  pattern: string;
  trigger: string;
  action: string;
  successRate: number;
  executionCount: number;
}

export interface MemoryQuery {
  query: string;
  teamId: string;
  userId?: string;
  sessionId?: string;
  types?: MemoryType[];
  limit?: number;
  minRelevance?: number;
  timeRange?: {
    start?: number;
    end?: number;
  };
  tags?: string[];
}

export interface MemoryRetrievalResult {
  entries: ScoredMemoryEntry[];
  totalCount: number;
  queryTime: number;
}

export interface ScoredMemoryEntry {
  entry: MemoryEntry;
  relevanceScore: number;
  recencyScore: number;
  importanceScore: number;
  combinedScore: number;
}

export interface ConsolidatedMemory {
  episodic: string;
  semantic: string;
  procedural: string;
  combined: string;
  tokenCount: number;
  entryCount: number;
}

export interface MemoryStoreOptions {
  maxEntries?: number;
  decayRate?: number;
  consolidationThreshold?: number;
  embeddingEnabled?: boolean;
}

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

export interface MemoryConsolidatorOptions {
  maxTokens?: number;
  episodicWeight?: number;
  semanticWeight?: number;
  proceduralWeight?: number;
  recencyBias?: number;
  importanceBias?: number;
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
