import { vespaClient } from "./client";
import { escapeYqlString } from "./query";
import type {
  ContextEntryDocument,
  ContextQueryParams,
  ContextRankingProfile,
  QueryMetrics,
  VectorTensor,
} from "./schemas";

export interface ContextSearchParams {
  teamId: string;
  query?: string;
  parentUri?: string;
  contextType?: string;
  category?: string;
  ownerType?: string;
  ownerId?: string;
  isLeaf?: boolean;
  rankingProfile?: ContextRankingProfile;
  embedding?: number[];
  limit?: number;
  offset?: number;
  timeout?: string;
}

export interface ContextSearchHit {
  id: string;
  relevance: number;
  document: ContextEntryDocument;
}

export interface ContextSearchResult {
  hits: ContextSearchHit[];
  totalCount: number;
  metrics: QueryMetrics;
}

function createVectorTensor(embedding: number[]): VectorTensor {
  return {
    type: `tensor<float>(x[${embedding.length}])`,
    values: embedding,
  };
}

function buildContextYql(params: ContextSearchParams): string {
  const clauses: string[] = [`team_id = "${escapeYqlString(params.teamId)}"`];

  if (params.parentUri) {
    clauses.push(`parent_uri = "${escapeYqlString(params.parentUri)}"`);
  }

  if (params.contextType) {
    clauses.push(`context_type = "${escapeYqlString(params.contextType)}"`);
  }

  if (params.category) {
    clauses.push(`category = "${escapeYqlString(params.category)}"`);
  }

  if (params.ownerType) {
    clauses.push(`owner_type = "${escapeYqlString(params.ownerType)}"`);
  }

  if (params.ownerId) {
    clauses.push(`owner_id = "${escapeYqlString(params.ownerId)}"`);
  }

  if (params.isLeaf !== undefined) {
    clauses.push(`is_leaf = ${params.isLeaf}`);
  }

  if (params.query && params.query.trim().length > 0) {
    const escaped = escapeYqlString(params.query);
    clauses.push(
      `(abstract_text contains "${escaped}" or overview_text contains "${escaped}")`
    );
  }

  return `select * from context_entry where ${clauses.join(" and ")}`;
}

export async function searchContext(
  params: ContextSearchParams
): Promise<ContextSearchResult> {
  const yql = buildContextYql(params);
  const limit = Math.min(params.limit ?? 20, 100);
  const offset = params.offset ?? 0;
  const ranking = params.rankingProfile ?? "hybrid";

  const queryParams: ContextQueryParams = {
    yql,
    ranking,
    hits: limit,
    offset,
    timeout: params.timeout ?? "5s",
  };

  if (params.embedding) {
    queryParams.query_embedding = createVectorTensor(params.embedding);
  }

  const { result, metrics } =
    await vespaClient.queryWithMetrics<ContextEntryDocument>(
      queryParams as Parameters<typeof vespaClient.queryWithMetrics>[0]
    );

  const hits: ContextSearchHit[] = (result.root?.children ?? []).map(
    (child) => ({
      id: child.id,
      relevance: child.relevance,
      document: child.fields,
    })
  );

  const totalCount = result.root?.fields?.totalCount ?? 0;

  return { hits, totalCount, metrics };
}

export async function searchContextByUri(
  teamId: string,
  uri: string
): Promise<ContextEntryDocument | null> {
  const yql = `select * from context_entry where team_id = "${escapeYqlString(teamId)}" and uri = "${escapeYqlString(uri)}"`;

  const result = await vespaClient.query<ContextEntryDocument>({
    yql,
    hits: 1,
    offset: 0,
  } as Parameters<typeof vespaClient.query>[0]);

  const firstChild = result.root?.children?.[0];
  return firstChild ? firstChild.fields : null;
}

export function searchContextChildren(
  teamId: string,
  parentUri: string,
  options?: {
    contextType?: string;
    limit?: number;
    embedding?: number[];
    rankingProfile?: ContextRankingProfile;
  }
): Promise<ContextSearchResult> {
  return searchContext({
    teamId,
    parentUri,
    contextType: options?.contextType,
    embedding: options?.embedding,
    rankingProfile: options?.rankingProfile ?? "hybrid_with_hotness",
    limit: options?.limit,
  });
}
