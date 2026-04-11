export { computeConfidence } from "./confidence";
export {
  getBatchCachedEmbeddings,
  getCachedEmbedding,
  getOrGenerateEmbedding,
  invalidateCachedEmbedding,
  setBatchCachedEmbeddings,
  setCachedEmbedding,
} from "./embedding-cache";
export {
  hybridSearch,
  keywordSearch,
  semanticSearch,
} from "./hybrid-search";
export type { AIInitOptions } from "./init";
export { initializeAI, isAIInitialized, resetAIInitialization } from "./init";
export { detectLanguage } from "./language";
export type {
  BuiltContext,
  CitationMatch,
  ContextChunk,
  ContextDocument,
  FanoutQuery,
  OverviewCitation,
  OverviewConfig,
  OverviewRequest,
  OverviewResponse,
  OverviewStreamChunk,
  OverviewStreamChunkType,
  OverviewTiming,
  OverviewUsage,
  RetrievalResult,
} from "./overview";
export {
  AgentOverviewOrchestrator,
  buildCitationMap,
  buildContext,
  buildContextDocuments,
  calculateGroundingScore,
  createOverviewOrchestrator,
  DEFAULT_OVERVIEW_CONFIG,
  deduplicateResults,
  extractCitationsFromText,
  extractCitationsRealtime,
  formatCitationPrompt,
  generateFanoutQueries,
  generateOverview,
  getAgentOverviewOrchestrator,
  mergeScores,
  OverviewOrchestrator,
  resolveCitations,
  selectDiverseDocuments,
  streamOverview,
  streamOverviewWithAgent,
} from "./overview";
export {
  askQuestion,
  buildRAGContext,
  ragAnswer,
  ragStream,
} from "./rag";
export type {
  AssembledContext,
  ChunkExtractionOptions,
  ClaimVerification,
  ContextAssemblyConfig,
  ConversationContext,
  ConversationMessage,
  ExtractedEntity,
  GroundingConfidence,
  GroundingResult,
  QueryAnalysis,
  QueryIntent,
  RAGChunk,
  RAGCitation,
  RAGOrchestratorConfig,
  RAGRequest,
  RAGResponse,
  RAGStreamChunk,
  RAGStreamChunkType,
  RAGTiming,
  TemporalContext,
  TokenUsage,
} from "./rag/index";
export {
  analyzeQuery,
  assembleContext,
  ConversationManager,
  extractChunks,
  extractChunksFromDocuments,
  getConversationManager,
  getRAGOrchestrator,
  RAGOrchestrator,
  rerankChunks,
  selectDiverse,
  verifyGrounding,
} from "./rag/index";
export type { ToolServicesOptions } from "./tool-binder";
export { createToolServices } from "./tool-binder";
export type {
  AnswerCitation,
  CachedEmbedding,
  HybridSearchParams,
  HybridSearchResult,
  RAGAnswer,
  RAGAnswerParams,
  RAGContext,
  RAGContextDocument,
  RAGContextParams,
  RerankParams,
  RerankResult,
  ScoredDocument,
} from "./types";
