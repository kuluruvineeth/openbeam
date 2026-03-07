import type { GenericDocument } from "@openbeam/vespa";
import type { SearchFilters } from "../types";
import {
  buildAccessControlClause,
  buildFilterClause,
  escapeYql,
} from "./query-builder";

export interface MatchFeatures {
  "bm25(title)"?: number;
  "bm25(content)"?: number;
  "closeness(field, content_embedding)"?: number;
  "closeness(field, embedding)"?: number;
  document_age_days?: number;
  recency_bin_index?: number;
  recency_bin_score?: number;
  hybrid_relevance?: number;
  sparse_score?: number;
  "attribute(authority_score)"?: number;
  "attribute(view_count)"?: number;
  "attribute(trending_score)"?: number;
  "attribute(updated_at)"?: number;
  "attribute(is_canonical)"?: number;
  "attribute(inbound_links_count)"?: number;
  [key: string]: number | undefined;
}

export interface DebugRetrievalResult {
  docId: string;
  score: number;
  rank: number;
  matchFeatures: MatchFeatures;
}

type DebugRankProfile =
  | "hybrid_debug"
  | "authority_debug"
  | "personalized_debug"
  | "enterprise_v2_debug"
  | "global_sorted"
  | "global_sorted_v2";

interface DebugRetrievalParams {
  query: string;
  embedding: number[];
  teamId: string;
  limit: number;
  rankProfile: DebugRankProfile;
  sparseEmbedding?: Record<string, number>;
  binSizeDays?: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

interface DebugSearchResult {
  id: string;
  relevance: number;
  source: string;
  fields: GenericDocument & { matchfeatures?: MatchFeatures };
}

interface DebugSearchResponse {
  root: {
    children?: DebugSearchResult[];
  };
}

async function queryWithDebug(params: {
  yql: string;
  ranking: DebugRankProfile;
  hits: number;
  timeout: string;
  embedding: number[];
  embeddingDims: number;
  isV2: boolean;
  sparseEmbedding?: Record<string, number>;
  binSizeDays?: number;
}): Promise<DebugSearchResponse> {
  const baseUrl = process.env.VESPA_URL || "http://localhost:8080";
  const embeddingKey = params.isV2
    ? "input.query(embedding_v2)"
    : "input.query(query_embedding)";

  const body: Record<string, unknown> = {
    yql: params.yql,
    hits: params.hits,
    "ranking.profile": params.ranking,
    timeout: params.timeout,
    [embeddingKey]: {
      type: `tensor<float>(x[${params.embeddingDims}])`,
      values: params.embedding,
    },
  };

  if (
    params.ranking === "global_sorted" ||
    params.ranking === "global_sorted_v2"
  ) {
    body["ranking.features.query(bin_size_days)"] = params.binSizeDays ?? 7;
  }

  if (
    params.sparseEmbedding &&
    Object.keys(params.sparseEmbedding).length > 0
  ) {
    body["input.query(sparse_embedding)"] = {
      cells: Object.entries(params.sparseEmbedding).map(([token, value]) => ({
        address: { token },
        value,
      })),
    };
  }

  const response = await fetch(`${baseUrl}/search/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Vespa debug query error: ${response.statusText}`);
  }

  return (await response.json()) as DebugSearchResponse;
}

export async function retrieveWithDebug(
  params: DebugRetrievalParams
): Promise<DebugRetrievalResult[]> {
  const {
    query,
    embedding,
    teamId,
    limit,
    rankProfile,
    sparseEmbedding,
    binSizeDays = 7,
    filters,
    accessControlIds,
  } = params;

  const targetHits = Math.min(limit * 3, 300);

  const isV2Profile =
    rankProfile === "global_sorted_v2" || rankProfile === "enterprise_v2_debug";
  const embeddingField = isV2Profile ? "embedding" : "content_embedding";
  const embeddingQueryName = isV2Profile ? "embedding_v2" : "query_embedding";
  const embeddingDims = isV2Profile ? 1024 : 1536;

  const conditions = [
    `team_id contains "${escapeYql(teamId)}"`,
    `({targetHits:${targetHits}}nearestNeighbor(${embeddingField}, ${embeddingQueryName})) or default contains "${escapeYql(query)}"`,
    buildFilterClause(filters),
    buildAccessControlClause(accessControlIds),
  ].filter(Boolean);

  const yql = `select id, matchfeatures from openbeam_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await queryWithDebug({
    yql,
    ranking: rankProfile,
    hits: limit,
    timeout: "5s",
    embedding,
    embeddingDims,
    isV2: isV2Profile,
    sparseEmbedding,
    binSizeDays,
  });

  return (result.root.children ?? []).map((child, index) => ({
    docId: child.fields.id,
    score: child.relevance,
    rank: index + 1,
    matchFeatures: child.fields.matchfeatures ?? {},
  }));
}

interface AnalyzeRankingParams {
  query: string;
  embedding: number[];
  teamId: string;
  limit?: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

export interface RankingAnalysis {
  docId: string;
  score: number;
  rank: number;
  breakdown: {
    bm25Title: number;
    bm25Content: number;
    vectorSimilarity: number;
    authorityScore: number;
    viewCount: number;
    ageInDays: number;
    recencyBin: number;
  };
}

export async function analyzeRanking(
  params: AnalyzeRankingParams
): Promise<RankingAnalysis[]> {
  const {
    query,
    embedding,
    teamId,
    limit = 20,
    filters,
    accessControlIds,
  } = params;

  const results = await retrieveWithDebug({
    query,
    embedding,
    teamId,
    limit,
    rankProfile: "global_sorted",
    filters,
    accessControlIds,
  });

  return results.map((r) => ({
    docId: r.docId,
    score: r.score,
    rank: r.rank,
    breakdown: {
      bm25Title: r.matchFeatures["bm25(title)"] ?? 0,
      bm25Content: r.matchFeatures["bm25(content)"] ?? 0,
      vectorSimilarity:
        r.matchFeatures["closeness(field, content_embedding)"] ?? 0,
      authorityScore: r.matchFeatures["attribute(authority_score)"] ?? 0,
      viewCount: r.matchFeatures["attribute(view_count)"] ?? 0,
      ageInDays: r.matchFeatures.document_age_days ?? 0,
      recencyBin: r.matchFeatures.recency_bin_index ?? 0,
    },
  }));
}
