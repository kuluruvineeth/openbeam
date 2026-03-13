import { vespaClient } from "./client";
import { escapeYqlString } from "./query";
import type {
  DocumentRankingProfile,
  GenericDocument,
  QueryMetrics,
  QueryParams,
  SearchResult,
  SparseTensor,
  VectorTensor,
} from "./schemas";

function createVectorTensor(embedding: number[]): VectorTensor {
  return {
    type: `tensor<float>(x[${embedding.length}])`,
    values: embedding,
  };
}

export interface RankedSearchParams {
  query: string;
  teamId: string;
  rankingProfile?: DocumentRankingProfile;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  embeddings?: SearchEmbeddings;
  timeout?: string;
}

export interface SearchFilters {
  connectorTypes?: string[];
  connectorIds?: string[];
  documentTypes?: string[];
  sourceIds?: string[];
  labels?: string[];
  dateRange?: {
    start?: number;
    end?: number;
  };
  accessControlIds?: string[];
  isPublic?: boolean;
}

export interface SearchEmbeddings {
  query?: number[];
  title?: number[];
  topic?: number[];
  sparse?: Record<string, number>;
  embeddingDimension?: number;
}

export interface PaginationMetadata {
  offset: number;
  limit: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
  nextOffset: number | null;
  previousOffset: number | null;
}

export interface SearchHit<T = GenericDocument> {
  id: string;
  relevance: number;
  source: string;
  document: T;
}

export interface RankedSearchResult<T = GenericDocument> {
  hits: SearchHit<T>[];
  pagination: PaginationMetadata;
  metrics: QueryMetrics;
  rankingProfile: DocumentRankingProfile;
  query: string;
}

function buildYqlFilters(filters: SearchFilters | undefined): string {
  const clauses: string[] = [];

  if (filters?.connectorTypes?.length) {
    const typeConditions = filters.connectorTypes
      .map((t) => `connector_type contains "${escapeYqlString(t)}"`)
      .join(" or ");
    clauses.push(`(${typeConditions})`);
  }

  if (filters?.connectorIds?.length) {
    const idConditions = filters.connectorIds
      .map((id) => `connector_id contains "${escapeYqlString(id)}"`)
      .join(" or ");
    clauses.push(`(${idConditions})`);
  }

  if (filters?.documentTypes?.length) {
    const docTypeConditions = filters.documentTypes
      .map((t) => `document_type contains "${escapeYqlString(t)}"`)
      .join(" or ");
    clauses.push(`(${docTypeConditions})`);
  }

  if (filters?.sourceIds?.length) {
    const sourceConditions = filters.sourceIds
      .map((id) => `source_id contains "${escapeYqlString(id)}"`)
      .join(" or ");
    clauses.push(`(${sourceConditions})`);
  }

  if (filters?.labels?.length) {
    const labelConditions = filters.labels
      .map((l) => `labels contains "${escapeYqlString(l)}"`)
      .join(" or ");
    clauses.push(`(${labelConditions})`);
  }

  if (filters?.dateRange?.start) {
    clauses.push(`created_at >= ${filters.dateRange.start}`);
  }

  if (filters?.dateRange?.end) {
    clauses.push(`created_at <= ${filters.dateRange.end}`);
  }

  if (filters?.accessControlIds?.length) {
    const aclConditions = filters.accessControlIds
      .map((id) => `access_control contains "${escapeYqlString(id)}"`)
      .join(" or ");
    clauses.push(`(is_public = true or ${aclConditions})`);
  }

  if (filters?.isPublic !== undefined) {
    clauses.push(`is_public = ${filters.isPublic}`);
  }

  return clauses.length > 0 ? clauses.join(" and ") : "";
}

function buildEmbeddingInputs(
  embeddings: SearchEmbeddings | undefined
): Pick<
  QueryParams,
  "embedding_v2" | "title_embedding" | "topic_embedding" | "sparse_embedding"
> {
  if (!embeddings) {
    return {};
  }

  const result: Pick<
    QueryParams,
    "embedding_v2" | "title_embedding" | "topic_embedding" | "sparse_embedding"
  > = {};

  if (embeddings.query) {
    result.embedding_v2 = createVectorTensor(embeddings.query);
  }

  if (embeddings.title) {
    result.title_embedding = createVectorTensor(embeddings.title);
  }

  if (embeddings.topic) {
    result.topic_embedding = createVectorTensor(embeddings.topic);
  }

  if (embeddings.sparse) {
    const cells = Object.entries(embeddings.sparse).map(([token, value]) => ({
      address: { token },
      value,
    }));
    result.sparse_embedding = { cells } as SparseTensor;
  }

  return result;
}

function buildPaginationMetadata(
  totalResults: number,
  offset: number,
  limit: number
): PaginationMetadata {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalResults / limit);
  const hasNextPage = offset + limit < totalResults;
  const hasPreviousPage = offset > 0;

  return {
    offset,
    limit,
    totalResults,
    hasNextPage,
    hasPreviousPage,
    currentPage,
    totalPages,
    nextOffset: hasNextPage ? offset + limit : null,
    previousOffset: hasPreviousPage ? Math.max(0, offset - limit) : null,
  };
}

function transformSearchResult<T = GenericDocument>(
  result: SearchResult<T>,
  params: RankedSearchParams,
  metrics: QueryMetrics
): RankedSearchResult<T> {
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  const totalResults = result.root?.fields?.totalCount ?? 0;
  const rankingProfile = params.rankingProfile ?? "hybrid";

  const hits: SearchHit<T>[] = (result.root?.children ?? []).map((child) => ({
    id: child.id,
    relevance: child.relevance,
    source: child.source,
    document: child.fields,
  }));

  return {
    hits,
    pagination: buildPaginationMetadata(totalResults, offset, limit),
    metrics,
    rankingProfile,
    query: params.query,
  };
}

export async function rankedSearch<T = GenericDocument>(
  params: RankedSearchParams
): Promise<RankedSearchResult<T>> {
  const escapedQuery = escapeYqlString(params.query);
  const limit = Math.min(params.limit ?? 20, 100);
  const offset = params.offset ?? 0;
  const rankingProfile = params.rankingProfile ?? "hybrid";

  const filterClause = buildYqlFilters(params.filters);
  const teamClause = `team_id contains "${escapeYqlString(params.teamId)}"`;

  const textMatchClause =
    params.query.trim().length > 0
      ? `(title contains "${escapedQuery}" or content contains "${escapedQuery}")`
      : "true";

  const whereClause = [teamClause, filterClause, textMatchClause]
    .filter(Boolean)
    .join(" and ");

  const yql = `select * from openbeam_document where ${whereClause}`;

  const embeddingInputs = buildEmbeddingInputs(params.embeddings);

  const queryParams: QueryParams = {
    yql,
    ranking: rankingProfile,
    hits: limit,
    offset,
    timeout: params.timeout ?? "5s",
    ...embeddingInputs,
  };

  const { result, metrics } =
    await vespaClient.queryWithMetrics<T>(queryParams);

  return transformSearchResult(result, params, metrics);
}

export type RankingStrategy =
  | "keyword"
  | "semantic"
  | "hybrid"
  | "recency"
  | "authority"
  | "personalized";

export function selectRankingProfile(
  strategy: RankingStrategy,
  hasEmbeddings: boolean
): DocumentRankingProfile {
  switch (strategy) {
    case "keyword":
      return "bm25";
    case "semantic":
      return hasEmbeddings ? "semantic_v2" : "bm25";
    case "hybrid":
      return hasEmbeddings ? "hybrid_v2" : "bm25";
    case "recency":
      return hasEmbeddings ? "hybrid_recency" : "recency";
    case "authority":
      return "authority";
    case "personalized":
      return hasEmbeddings ? "personalized" : "hybrid_v2";
    default:
      return "hybrid_v2";
  }
}

export interface SimilarDocumentsParams {
  documentId: string;
  teamId: string;
  embedding: number[];
  limit?: number;
  excludeIds?: string[];
}

export async function findSimilarDocuments(
  params: SimilarDocumentsParams
): Promise<RankedSearchResult<GenericDocument>> {
  const limit = Math.min(params.limit ?? 10, 50);
  const excludeClause =
    params.excludeIds && params.excludeIds.length > 0
      ? ` and !(${params.excludeIds.map((id) => `id = "${escapeYqlString(id)}"`).join(" or ")})`
      : "";

  const yql = `select * from openbeam_document where team_id contains "${escapeYqlString(params.teamId)}"${excludeClause}`;

  const queryParams: QueryParams = {
    yql,
    ranking: "semantic_v2",
    hits: limit,
    offset: 0,
    timeout: "3s",
    embedding_v2: createVectorTensor(params.embedding),
  };

  const { result, metrics } =
    await vespaClient.queryWithMetrics<GenericDocument>(queryParams);

  return transformSearchResult(
    result,
    {
      query: `similar:${params.documentId}`,
      teamId: params.teamId,
      rankingProfile: "semantic",
      limit,
      offset: 0,
    },
    metrics
  );
}

export interface MultiRankingSearchParams {
  query: string;
  teamId: string;
  strategies: RankingStrategy[];
  embeddings?: SearchEmbeddings;
  limit?: number;
  filters?: SearchFilters;
}

export interface MultiRankingResult {
  results: Map<RankingStrategy, RankedSearchResult<GenericDocument>>;
  aggregatedHits: SearchHit<GenericDocument>[];
  bestStrategy: RankingStrategy;
}

export async function searchWithMultipleRankings(
  params: MultiRankingSearchParams
): Promise<MultiRankingResult> {
  const hasEmbeddings = !!(
    params.embeddings?.query ||
    params.embeddings?.title ||
    params.embeddings?.topic
  );

  const searchPromises = params.strategies.map(async (strategy) => {
    const rankingProfile = selectRankingProfile(strategy, hasEmbeddings);
    const result = await rankedSearch({
      query: params.query,
      teamId: params.teamId,
      rankingProfile,
      limit: params.limit ?? 20,
      filters: params.filters,
      embeddings: params.embeddings,
    });
    return { strategy, result };
  });

  const searchResults = await Promise.all(searchPromises);

  const results = new Map<
    RankingStrategy,
    RankedSearchResult<GenericDocument>
  >();
  for (const { strategy, result } of searchResults) {
    results.set(strategy, result);
  }

  const docScores = new Map<
    string,
    { score: number; hit: SearchHit<GenericDocument> }
  >();
  for (const { result } of searchResults) {
    for (const hit of result.hits) {
      const existing = docScores.get(hit.id);
      if (!existing || hit.relevance > existing.score) {
        docScores.set(hit.id, { score: hit.relevance, hit });
      }
    }
  }

  const aggregatedHits = Array.from(docScores.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.hit);

  let bestStrategy: RankingStrategy = params.strategies[0] ?? "hybrid";
  let bestScore = 0;
  for (const { strategy, result } of searchResults) {
    const avgRelevance =
      result.hits.length > 0
        ? result.hits.reduce((sum, h) => sum + h.relevance, 0) /
          result.hits.length
        : 0;
    if (avgRelevance > bestScore) {
      bestScore = avgRelevance;
      bestStrategy = strategy;
    }
  }

  return {
    results,
    aggregatedHits,
    bestStrategy,
  };
}
