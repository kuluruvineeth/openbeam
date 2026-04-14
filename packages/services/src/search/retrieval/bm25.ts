import { vespaSearchEngine } from "../engine-vespa";
import type { RetrievalResult, SearchFilters } from "../types";
import {
  buildAccessControlClause,
  buildFilterClause,
  escapeYql,
} from "./query-builder";

interface BM25RetrievalParams {
  query: string;
  teamId: string;
  limit: number;
  filters?: SearchFilters;
  accessControlIds?: string[];
}

export async function retrieveBM25(
  params: BM25RetrievalParams
): Promise<RetrievalResult[]> {
  const { query, teamId, limit, filters, accessControlIds } = params;

  const conditions = [
    `team_id contains "${escapeYql(teamId)}"`,
    `default contains "${escapeYql(query)}"`,
    buildFilterClause(filters),
    buildAccessControlClause(accessControlIds),
  ].filter(Boolean);

  const yql = `select id from openbeam_document where ${conditions.join(" and ")} limit ${limit}`;

  const result = await vespaSearchEngine.query({
    yql,
    ranking: "bm25",
    hits: limit,
    timeout: "3s",
  });

  return (result.root.children ?? []).map((child, index) => ({
    docId: child.fields.id,
    score: child.relevance,
    rank: index + 1,
  }));
}
