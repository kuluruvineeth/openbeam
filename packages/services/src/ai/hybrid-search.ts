import {
  type Embedding,
  getConfig as getAIConfig,
  getBGEM3Provider,
} from "@openplane/ai";
import { buildVectorQueryFeatures, vespaClient } from "@openplane/vespa";
import { getOrGenerateEmbedding } from "./embedding-cache";
import type {
  HybridSearchParams,
  HybridSearchResult,
  ScoredDocument,
} from "./types";

const DEFAULT_CONFIG = {
  limit: 20,
  offset: 0,
  bm25Weight: 0.6,
  vectorWeight: 0.4,
  minScore: 0.1,
};

function escapeYqlString(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

export async function hybridSearch(
  params: HybridSearchParams
): Promise<HybridSearchResult> {
  const startTime = Date.now();
  let embeddingTime: number | undefined;

  const {
    query,
    teamId,
    limit = DEFAULT_CONFIG.limit,
    offset = DEFAULT_CONFIG.offset,
    bm25Weight: _bm25Weight = DEFAULT_CONFIG.bm25Weight,
    vectorWeight: _vectorWeight = DEFAULT_CONFIG.vectorWeight,
    minScore = DEFAULT_CONFIG.minScore,
    connectorTypes,
    documentTypes,
    accessControlIds,
  } = params;

  let queryEmbedding: Embedding;
  const embeddingStartTime = Date.now();

  if (params.queryEmbedding) {
    queryEmbedding = params.queryEmbedding;
  } else {
    const aiConfig = getAIConfig();
    queryEmbedding = await getOrGenerateEmbedding(
      query,
      aiConfig.defaultEmbeddingModel,
      async () => {
        const bgeProvider = getBGEM3Provider();
        const result = await bgeProvider.embedQuery(query);
        return result.dense;
      }
    );
    embeddingTime = Date.now() - embeddingStartTime;
  }

  const conditions: string[] = [];

  conditions.push(`team_id contains "${escapeYqlString(teamId)}"`);

  if (query.trim()) {
    const vectorClause = `({targetHits:${limit * 2}}nearestNeighbor(content_embedding, query_embedding))`;
    const textClause = `default contains "${escapeYqlString(query)}"`;
    conditions.push(`(${vectorClause} or (${textClause}))`);
  } else {
    conditions.push(
      `({targetHits:${limit * 2}}nearestNeighbor(content_embedding, query_embedding))`
    );
  }

  if (connectorTypes?.length) {
    const typeConditions = connectorTypes
      .map((t) => `connector_type contains "${escapeYqlString(t)}"`)
      .join(" or ");
    conditions.push(`(${typeConditions})`);
  }

  if (documentTypes?.length) {
    const docTypeConditions = documentTypes
      .map((t) => `document_type contains "${escapeYqlString(t)}"`)
      .join(" or ");
    conditions.push(`(${docTypeConditions})`);
  }

  if (accessControlIds?.length) {
    const aclConditions = accessControlIds
      .map((id) => `access_control contains "${escapeYqlString(id)}"`)
      .join(" or ");
    conditions.push(`(is_public = true or (${aclConditions}))`);
  } else {
    conditions.push("is_public = true");
  }

  const yql = `select * from openplane_document where ${conditions.join(" and ")} limit ${limit} offset ${offset}`;

  const vectorFeatures = buildVectorQueryFeatures(queryEmbedding);

  const result = await vespaClient.query({
    yql,
    ranking: "hybrid",
    hits: limit,
    offset,
    ...vectorFeatures,
  });

  const documents: ScoredDocument[] = [];

  if (result.root.children) {
    for (const child of result.root.children) {
      const doc = child.fields as ScoredDocument;
      const relevance = (child as { relevance?: number }).relevance || 0;

      if (relevance < minScore) {
        continue;
      }

      documents.push({
        ...doc,
        relevanceScore: relevance,
      });
    }
  }

  const total =
    (result.root.fields?.totalCount as number | undefined) || documents.length;

  return {
    documents,
    total,
    queryTime: Date.now() - startTime,
    embeddingTime,
  };
}

export function semanticSearch(
  params: Omit<HybridSearchParams, "bm25Weight" | "vectorWeight">
): Promise<HybridSearchResult> {
  return hybridSearch({
    ...params,
    bm25Weight: 0,
    vectorWeight: 1,
  });
}

export async function keywordSearch(
  params: Omit<
    HybridSearchParams,
    "bm25Weight" | "vectorWeight" | "queryEmbedding"
  >
): Promise<HybridSearchResult> {
  const startTime = Date.now();

  const {
    query,
    teamId,
    limit = DEFAULT_CONFIG.limit,
    offset = DEFAULT_CONFIG.offset,
    connectorTypes,
    documentTypes,
    accessControlIds,
  } = params;

  const conditions: string[] = [];

  conditions.push(`team_id contains "${escapeYqlString(teamId)}"`);

  if (query.trim()) {
    conditions.push(`(default contains "${escapeYqlString(query)}")`);
  }

  if (connectorTypes?.length) {
    const typeConditions = connectorTypes
      .map((t) => `connector_type contains "${escapeYqlString(t)}"`)
      .join(" or ");
    conditions.push(`(${typeConditions})`);
  }

  if (documentTypes?.length) {
    const docTypeConditions = documentTypes
      .map((t) => `document_type contains "${escapeYqlString(t)}"`)
      .join(" or ");
    conditions.push(`(${docTypeConditions})`);
  }

  if (accessControlIds?.length) {
    const aclConditions = accessControlIds
      .map((id) => `access_control contains "${escapeYqlString(id)}"`)
      .join(" or ");
    conditions.push(`(is_public = true or (${aclConditions}))`);
  } else {
    conditions.push("is_public = true");
  }

  const yql = `select * from openplane_document where ${conditions.join(" and ")} limit ${limit} offset ${offset}`;

  const result = await vespaClient.query({
    yql,
    ranking: "bm25",
    hits: limit,
    offset,
  });

  const documents: ScoredDocument[] = [];

  if (result.root.children) {
    for (const child of result.root.children) {
      const doc = child.fields as ScoredDocument;
      const relevance = (child as { relevance?: number }).relevance || 0;

      documents.push({
        ...doc,
        relevanceScore: relevance,
        bm25Score: relevance,
      });
    }
  }

  const total =
    (result.root.fields?.totalCount as number | undefined) || documents.length;

  return {
    documents,
    total,
    queryTime: Date.now() - startTime,
  };
}
