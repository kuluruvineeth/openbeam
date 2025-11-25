/**
 * Vespa Services - Central Export
 */

export {
  type BulkIndexOptions,
  type IndexingProgress,
  type IndexingResult,
  IndexingService,
  indexingService,
} from "./indexing-service";
export {
  type FacetedSearchOptions,
  type FacetedSearchResult,
  type FacetResult,
  type SearchScope,
  SearchService,
  type SearchSuggestion,
  searchService,
  type UnifiedSearchOptions,
  type UnifiedSearchResult,
} from "./search-service";
