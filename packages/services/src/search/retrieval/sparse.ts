import { vespaClient } from "@openplane/vespa";
import type { RetrievalResult, SearchFilters } from "../types";
import {
  buildAccessControlClause,
  buildFilterClause,
  escapeYql,
} from "./query-builder";

interface SparseRetrievalParams {
  sparseEmbedding: Record<string, number>;
  teamId: string;
  limit: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

export async function retrieveSparse(
  params: SparseRetrievalParams
): Promise<RetrievalResult[]> {
  const { sparseEmbedding, teamId, limit, filters, accessControlIds } = params;

  if (Object.keys(sparseEmbedding).length === 0) {
    return [];
  }

  const conditions = [
    `team_id contains "${escapeYql(teamId)}"`,
    buildFilterClause(filters),
    buildAccessControlClause(accessControlIds),
  ].filter(Boolean);

  const yql = `select id from openplane_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await vespaClient.query({
    yql,
    ranking: "sparse_v2",
    hits: limit,
    timeout: "3s",
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
