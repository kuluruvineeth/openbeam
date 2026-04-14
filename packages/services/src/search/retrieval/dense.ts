import { vespaSearchEngine } from "../engine-vespa";
import type { RetrievalResult, SearchFilters } from "../types";
import {
  buildAccessControlClause,
  buildFilterClause,
  escapeYql,
} from "./query-builder";

interface DenseRetrievalParams {
  embedding: number[];
  teamId: string;
  limit: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

export async function retrieveDense(
  params: DenseRetrievalParams
): Promise<RetrievalResult[]> {
  const { embedding, teamId, limit, filters, accessControlIds } = params;

  const targetHits = Math.min(limit * 3, 300);

  const conditions = [
    `team_id contains "${escapeYql(teamId)}"`,
    `({targetHits:${targetHits}}nearestNeighbor(embedding, embedding_v2))`,
    buildFilterClause(filters),
    buildAccessControlClause(accessControlIds),
  ].filter(Boolean);

  const yql = `select id from openbeam_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await vespaSearchEngine.query({
    yql,
    ranking: "semantic_v2",
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
