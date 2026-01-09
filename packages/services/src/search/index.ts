export type { ClickData, ExperimentVariant } from "./experiments";
export { ExperimentService, experimentService } from "./experiments";
export { reciprocalRankFusion } from "./fusion/rrf";
export { weightedReciprocalRankFusion } from "./fusion/weighted-rrf";
export type {
  DocumentFeatures as LTRDocumentFeatures,
  LTRConfig,
  LTRHealth,
  LTRRequest,
  LTRResponse,
  LTRResult,
  UserContext as LTRUserContext,
} from "./ltr";
export { callLTR, getLTRHealth, LTRService, ltrService } from "./ltr";
export type {
  ExperimentMetrics,
  ImpressionData,
  SearchMetrics,
} from "./metrics";
export {
  aggregateExperimentMetrics,
  calculateCTR,
  calculateMetrics,
  calculateMRR,
  calculateNDCG,
} from "./metrics";
export {
  HybridSearchOrchestrator,
  hybridSearchOrchestrator,
} from "./orchestrator";
export type {
  RerankDocument,
  RerankerConfig,
  RerankResponse,
  RerankResult,
  RerankStats,
} from "./reranking";
export {
  callRerank,
  getRerankStats,
  RerankerService,
  rerankerService,
} from "./reranking";
export { retrieveBM25 } from "./retrieval/bm25";
export { retrieveDense } from "./retrieval/dense";
export {
  buildAccessControlClause,
  buildFilterClause,
} from "./retrieval/query-builder";
export { retrieveSparse } from "./retrieval/sparse";
export { SearchService, searchService } from "./service";
export type {
  AuthorFacet,
  AuthorFacetsParams,
  AuthorSearchParams,
  ConnectorFacet,
  ConnectorFacetsParams,
  DocumentSearchResult,
  HybridSearchRequest,
  HybridSearchResponse,
  MediaSearchParams,
  MediaSearchRanking,
  MediaSearchResult,
  RankedDocument,
  RecentDocumentsParams,
  RetrievalResult,
  RRFConfig,
  ScoredMedia,
  SearchFilters,
  SearchMetadata,
  SearchMode,
  SearchParams,
  SearchRanking,
  SearchScoredDocument,
  SearchTiming,
  SimilarDocumentsParams,
  ThreadSearchParams,
  UnifiedSearchItem,
  UnifiedSearchParams,
  UnifiedSearchResult,
} from "./types";
export { RRFConfigSchema, SearchModeSchema } from "./types";
