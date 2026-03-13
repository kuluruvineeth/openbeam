import type { GenericDocument } from "@openbeam/vespa";
import type { RetrievalResult, SearchFilters } from "../types";
import {
  buildAccessControlClause,
  buildFilterClause,
  escapeYql,
} from "./query-builder";

interface GlobalSortedRetrievalParams {
  query: string;
  embedding: number[];
  teamId: string;
  limit: number;
  binSizeDays?: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

interface VespaSearchResponse {
  root: {
    children?: Array<{
      id: string;
      relevance: number;
      source: string;
      fields: GenericDocument;
    }>;
  };
}

async function queryGlobalSorted(params: {
  yql: string;
  ranking: "global_sorted" | "global_sorted_v2";
  hits: number;
  timeout: string;
  embedding: number[];
  embeddingDims: number;
  isV2: boolean;
  binSizeDays: number;
  sparseEmbedding?: Record<string, number>;
}): Promise<VespaSearchResponse> {
  const baseUrl = process.env.VESPA_URL || "http://localhost:8080";
  const embeddingKey = "input.query(embedding_v2)";

  const body: Record<string, unknown> = {
    yql: params.yql,
    hits: params.hits,
    "ranking.profile": params.ranking,
    timeout: params.timeout,
    [embeddingKey]: {
      type: `tensor<float>(x[${params.embeddingDims}])`,
      values: params.embedding,
    },
    "ranking.features.query(bin_size_days)": params.binSizeDays,
  };

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
    throw new Error(`Vespa global_sorted query error: ${response.statusText}`);
  }

  return (await response.json()) as VespaSearchResponse;
}

export async function retrieveGlobalSorted(
  params: GlobalSortedRetrievalParams
): Promise<RetrievalResult[]> {
  const {
    query,
    embedding,
    teamId,
    limit,
    binSizeDays = 7,
    filters,
    accessControlIds,
  } = params;

  const targetHits = Math.min(limit * 3, 300);

  const conditions = [
    `team_id contains "${escapeYql(teamId)}"`,
    `({targetHits:${targetHits}}nearestNeighbor(embedding, embedding_v2)) or default contains "${escapeYql(query)}"`,
    buildFilterClause(filters),
    buildAccessControlClause(accessControlIds),
  ].filter(Boolean);

  const yql = `select id from openbeam_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await queryGlobalSorted({
    yql,
    ranking: "global_sorted_v2",
    hits: limit,
    timeout: "3s",
    embedding,
    embeddingDims: 1024,
    isV2: true,
    binSizeDays,
  });

  return (result.root.children ?? []).map((child, index) => ({
    docId: child.fields.id,
    score: child.relevance,
    rank: index + 1,
  }));
}

interface GlobalSortedV2RetrievalParams {
  query: string;
  embedding: number[];
  sparseEmbedding?: Record<string, number>;
  teamId: string;
  limit: number;
  binSizeDays?: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

export async function retrieveGlobalSortedV2(
  params: GlobalSortedV2RetrievalParams
): Promise<RetrievalResult[]> {
  const {
    query,
    embedding,
    sparseEmbedding,
    teamId,
    limit,
    binSizeDays = 7,
    filters,
    accessControlIds,
  } = params;

  const targetHits = Math.min(limit * 3, 300);

  const conditions = [
    `team_id contains "${escapeYql(teamId)}"`,
    `({targetHits:${targetHits}}nearestNeighbor(embedding, embedding_v2)) or default contains "${escapeYql(query)}"`,
    buildFilterClause(filters),
    buildAccessControlClause(accessControlIds),
  ].filter(Boolean);

  const yql = `select id from openbeam_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await queryGlobalSorted({
    yql,
    ranking: "global_sorted_v2",
    hits: limit,
    timeout: "3s",
    embedding,
    embeddingDims: 1024,
    isV2: true,
    binSizeDays,
    sparseEmbedding,
  });

  return (result.root.children ?? []).map((child, index) => ({
    docId: child.fields.id,
    score: child.relevance,
    rank: index + 1,
  }));
}
