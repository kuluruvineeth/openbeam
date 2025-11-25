/**
 * OpenPlane Vespa Package
 *
 * Enterprise search infrastructure powered by Vespa.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import {
 *   // Clients
 *   documentClient,
 *   personClient,
 *   codeClient,
 *   entityClient,
 *
 *   // Services
 *   searchService,
 *   indexingService,
 *
 *   // Query builders
 *   documentQuery,
 *   personQuery,
 *   codeQuery,
 *   entityQuery,
 *
 *   // Types
 *   type OpenPlaneDocument,
 *   type Person,
 *   type CodeDocument,
 *   type Entity,
 * } from "@openplane/vespa";
 *
 * // Unified search across all content
 * const results = await searchService.search({
 *   query: "quarterly report",
 *   teamId: "team_123",
 *   scope: "all",
 * });
 *
 * // Type-safe query building
 * const yql = documentQuery()
 *   .forTeam("team_123")
 *   .ofConnectorType("slack")
 *   .searchText("meeting notes")
 *   .withinDays("created_at", 7)
 *   .limit(20)
 *   .build();
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  AccessControlFields,
  // Common types
  BaseDocument,
  CodeDocument,
  CodeInput,
  CodeRankProfile,
  CodeSearchHit,
  CodeSearchOptions,
  CodeUpdate,
  ConnectorType,
  DateRangeFilter,
  DocumentInput,
  DocumentPriority,
  DocumentRankProfile,
  DocumentSearchHit,
  DocumentSentiment,
  DocumentStatus,
  // Document types
  DocumentType,
  DocumentUpdate,
  Embedding,
  EmbeddingConfig,
  Entity,
  EntityInput,
  EntityRankProfile,
  EntitySearchHit,
  EntitySearchOptions,
  EntityStatus,
  // Entity types
  EntityType,
  EntityUpdate,
  OpenPlaneDocument,
  PaginatedResult,
  PaginationOptions,
  Person,
  PersonInput,
  PersonRankProfile,
  PersonSearchHit,
  PersonSearchOptions,
  // Person types
  PersonStatus,
  PersonUpdate,
  // Code types
  ProgrammingLanguage,
  SortOptions,
  SourceType,
  VespaError,
  VespaFeedResponse,
  VespaHit,
  VespaQueryParams,
  VespaSearchResult,
} from "./types";

export { DEFAULT_EMBEDDING_DIMENSIONS } from "./types";

// =============================================================================
// CLIENTS
// =============================================================================

export {
  // Base client
  BaseVespaClient,
  // Code client
  CodeClient,
  codeClient,
  // Document client
  DocumentClient,
  type DocumentSearchOptions,
  documentClient,
  // Entity client
  EntityClient,
  entityClient,
  type FeedOptions,
  // Person client
  PersonClient,
  personClient,
  type VespaClientConfig,
} from "./clients";

// =============================================================================
// QUERY BUILDERS
// =============================================================================

export {
  CodeQueryBuilder,
  codeQuery,
  // Schema-specific builders
  DocumentQueryBuilder,
  // Factory functions
  documentQuery,
  EntityQueryBuilder,
  entityQuery,
  escapeYql,
  formatEmbedding,
  PersonQueryBuilder,
  personQuery,
  // Base builder
  YqlBuilder,
  yql,
} from "./query";

// =============================================================================
// SERVICES
// =============================================================================

export {
  type BulkIndexOptions,
  type FacetedSearchOptions,
  type FacetedSearchResult,
  type FacetResult,
  type IndexingProgress,
  type IndexingResult,
  // Indexing service
  IndexingService,
  indexingService,
  type SearchScope,
  // Search service
  SearchService,
  type SearchSuggestion,
  searchService,
  type UnifiedSearchOptions,
  type UnifiedSearchResult,
} from "./services";

// =============================================================================
// UTILITIES
// =============================================================================

export {
  BATCH_SIZES,
  batchArray,
  buildAccessControlList,
  CODE_RANK_PROFILES,
  CONCURRENCY,
  CONNECTOR_TYPES,
  calculateFreshnessScore,
  calculatePopularityScore,
  calculateQualityScore,
  cosineSimilarity,
  countWords,
  DEFAULT_NAMESPACE,
  DOCUMENT_RANK_PROFILES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  dateToTimestamp,
  daysAgo,
  deduplicateBy,
  EMBEDDING_DIMENSIONS,
  ENTITY_RANK_PROFILES,
  ENTITY_TYPES,
  extractDocuments,
  extractPreview,
  filterByRelevance,
  generateCodeId,
  // Helper functions
  generateDocumentId,
  generateEntityId,
  generatePersonId,
  hasAccess,
  hoursAgo,
  normalizeEmbedding,
  PERSON_RANK_PROFILES,
  PRIORITIES,
  PROGRAMMING_LANGUAGES,
  parallelProcess,
  parseDocumentId,
  // Constants
  SCHEMAS,
  type SchemaName,
  stripHtml,
  TIMEOUTS,
  timestampToDate,
  truncateText,
  VISIBILITY_LEVELS,
  validateEmbedding,
} from "./utils";

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// =============================================================================

// Re-export the old VespaClient as an alias to DocumentClient
export {
  DocumentClient as VespaClient,
  documentClient as vespaClient,
} from "./clients";

// Legacy bulk indexer (now part of IndexingService)
export { indexingService as bulkIndexer } from "./services";
export async function bulkIndexDocuments(
  documents: import("./types").DocumentInput[],
  options?: import("./services").BulkIndexOptions
) {
  const { indexingService } = await import("./services");
  return indexingService.indexDocuments(documents, options);
}

// Legacy query builder (now use documentQuery, etc.)
export { documentQuery as buildQuery } from "./query";
