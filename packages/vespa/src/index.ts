export {
  type BatchFailure,
  type BatchResult,
  createBatchResult,
  isRetryableError,
} from "./batch-types";
export { VespaBatcher, vespaBatcher } from "./batcher";
export { BulkIndexer, bulkIndexDocuments, bulkIndexer } from "./bulk-indexer";
export { VespaClient, type VespaClientOptions, vespaClient } from "./client";
export {
  type ContextSearchHit,
  type ContextSearchParams,
  type ContextSearchResult,
  searchContext,
  searchContextByUri,
  searchContextChildren,
} from "./context-search";
export {
  type BulkUpdateParams,
  type BulkUpdateResult,
  bulkUpdateDocuments,
  checkDocumentWarnings,
  deleteDocumentById,
  deleteDocumentsByConnector,
  type FeedApprovalLevel,
  type FeedOperationParams,
  type FeedOperationResult,
  type FeedValidationError,
  type FeedValidationResult,
  type FeedValidationWarning,
  feedDocuments,
  feedSingleDocument,
  type PendingFeedOperation,
  type UpdateDocumentParams,
  updateDocumentFields,
  validateDocument,
  validateDocuments,
} from "./feed";
export {
  buildMediaVectorQueryFeatures,
  buildVectorQueryFeatures,
  escapeYqlString,
  serializeIndexedTensor,
  serializeSparseFromRecord,
  serializeSparseTensor,
  serializeVectorTensor,
} from "./query";
export * from "./schemas";
export {
  findSimilarDocuments,
  type MultiRankingResult,
  type MultiRankingSearchParams,
  type PaginationMetadata,
  type RankedSearchParams,
  type RankedSearchResult,
  type RankingStrategy,
  rankedSearch,
  type SearchEmbeddings,
  type SearchFilters,
  type SearchHit,
  type SimilarDocumentsParams,
  searchWithMultipleRankings,
  selectRankingProfile,
} from "./search";
