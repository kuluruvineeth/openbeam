export type {
  ConsolidatedMemory,
  EpisodicEntry,
  ImportanceLevel,
  MatchType,
  MemoryConsolidatorOptions,
  MemoryEntry,
  MemoryMetadata,
  MemoryQuery,
  MemoryRetrievalResult,
  MemoryStoreOptions,
  MemoryType,
  PersistentMemoryEntry,
  PersistentMemorySearchOptions,
  PersistentMemorySearchResult,
  ProceduralEntry,
  ScoredMemoryEntry,
  SemanticEntry,
  SessionMemory,
  SessionMessage,
  SessionMessageRole,
  SummarizationResult,
} from "@openplane/types/ai";
export type {
  Correction,
  HistoryItem,
  LearnedFact,
  MemoryAccess,
  MemorySignal,
  MemorySignalImportance,
  MemorySignalType,
  ProceduralSuggestion,
  SourceFrequency,
  UserPreferences,
} from "./access";
export {
  createEmptyMemoryAccess,
  createMemoryAccess,
  MemoryAccessImpl,
} from "./access";
export type { MemorySystemOptions } from "./consolidator";
export { createMemoryConsolidator, MemoryConsolidator } from "./consolidator";
export type {
  CompactionResult,
  Conversation,
  ConversationManagerOptions,
  ConversationMessage,
  ConversationSearchResult,
  ConversationStore,
  ConversationSummary,
} from "./conversation";
export {
  ConversationManager,
  createConversationManager,
  InMemoryConversationStore,
} from "./conversation";
export type {
  DurableMemoryEntry,
  DurableMemorySearchOptions,
  DurableMemoryStore,
  MemoryScope,
} from "./durable-store";
export { createDurableMemoryStore } from "./durable-store";

export type {
  BatchEmbeddingOptions,
  CachedEmbeddingProviderOptions,
  EmbeddingCacheOptions,
} from "./embeddings";
export {
  CachedEmbeddingProvider,
  createCachedEmbeddingProvider,
  EmbeddingCache,
  embedBatch,
} from "./embeddings";
export type { EpisodicMemoryOptions } from "./episodic";
export { createEpisodicMemory, EpisodicMemory } from "./episodic";
export type {
  EmbeddingProvider,
  LongTermMemory,
  LongTermMemoryEntry,
  LongTermMemoryOptions,
  MemorySearchResult as LongTermMemorySearchResult,
  VectorDocument,
  VectorSearchResult,
  VectorStore,
} from "./long-term";
export {
  createLongTermMemory,
  InMemoryVectorStore,
  LongTermMemoryStore,
  MockEmbeddingProvider,
} from "./long-term";
export type {
  PersistentMemory,
  PersistentMemoryStoreOptions,
} from "./persistent";
export {
  createPersistentMemory,
  PersistentMemoryStoreImpl,
} from "./persistent";
export type { ProceduralMemoryOptions } from "./procedural";
export { createProceduralMemory, ProceduralMemory } from "./procedural";
export type {
  HybridSearchConfig,
  HybridSearchDeps,
  HybridSearchResult,
} from "./search";
export {
  computeKeywordScore,
  extractQueryTerms,
  hybridSearch,
} from "./search";
export type { SemanticMemoryOptions } from "./semantic";
export { createSemanticMemory, SemanticMemory } from "./semantic";
export type {
  SessionMemoryOptions,
  SessionMemoryStore,
} from "./session";
export {
  createSessionMemory,
  SessionMemoryStoreImpl,
} from "./session";
export type {
  S3SpillClient,
  SessionState,
  SessionStateClient,
  SessionStateEntry,
  SessionStateMetadata,
  SessionStateOptions,
} from "./session-state";
export {
  createSessionState,
  InMemoryS3SpillClient,
  InMemorySessionStateClient,
  SessionStateStore,
} from "./session-state";
export type {
  ShortTermMemory,
  ShortTermMemoryClient,
  ShortTermMemoryOptions,
} from "./short-term";
export {
  createShortTermMemory,
  InMemoryShortTermClient,
  ShortTermMemoryStore,
} from "./short-term";
export type {
  SummarizerDeps,
  SummarizerOptions,
} from "./summarizer";
export {
  progressiveSummarize,
  summarizeMessages,
} from "./summarizer";
export type { MemoryStore } from "./types";
export {
  DEFAULT_CONSOLIDATION_OPTIONS,
  DEFAULT_MEMORY_OPTIONS,
} from "./types";
