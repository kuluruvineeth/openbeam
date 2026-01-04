import { vespaClient } from "@openplane/vespa";
import type { RetrievalResult, SearchFilters } from "../types";
import {
  buildAccessControlClause,
  buildFilterClause,
  escapeYql,
} from "./query-builder";

interface HybridRetrievalParams {
  query: string;
  embedding: number[];
  teamId: string;
  limit: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

export async function retrieveHybrid(
  params: HybridRetrievalParams
): Promise<RetrievalResult[]> {
  const { query, embedding, teamId, limit, filters, accessControlIds } = params;

  const targetHits = Math.min(limit * 3, 300);

  const conditions = [
    `team_id contains "${escapeYql(teamId)}"`,
    `({targetHits:${targetHits}}nearestNeighbor(embedding, embedding_v2)) or default contains "${escapeYql(query)}"`,
    buildFilterClause(filters),
    buildAccessControlClause(accessControlIds),
  ].filter(Boolean);

  const yql = `select id from openplane_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await vespaClient.query({
    yql,
    ranking: "hybrid_v2",
    hits: limit,
    timeout: "3s",
    embedding_v2: { type: "tensor<float>(x[1024])", values: embedding },
  });

  return (result.root.children ?? []).map((child, index) => ({
    docId: child.fields.id,
    score: child.relevance,
    rank: index + 1,
  }));
}

interface HybridRetrievalWithSparseParams extends HybridRetrievalParams {
  sparseEmbedding: Record<string, number>;
}

export async function retrieveHybridWithSparse(
  params: HybridRetrievalWithSparseParams
): Promise<RetrievalResult[]> {
  const {
    query,
    embedding,
    sparseEmbedding,
    teamId,
    limit,
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

  const yql = `select id from openplane_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await vespaClient.query({
    yql,
    ranking: "hybrid_v2",
    hits: limit,
    timeout: "3s",
    embedding_v2: { type: "tensor<float>(x[1024])", values: embedding },
    sparse_embedding: {
      cells: Object.entries(sparseEmbedding).map(([token, value]) => ({
        address: { token },
        value,
      })),
    },
  });

  return (result.root.children ?? []).map((child, index) => ({
    docId: child.fields.id,
    score: child.relevance,
    rank: index + 1,
  }));
}
