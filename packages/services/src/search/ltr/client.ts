import { getConfig } from "@openbeam/ai";
import { z } from "zod";
import type {
  DocumentFeatures,
  LTRHealth,
  LTRResponse,
  UserContext,
} from "./types";

interface EngineLTRRequest {
  query: string;
  documents: Array<{
    doc_id: string;
    bm25_title: number;
    bm25_content: number;
    dense_score: number;
    sparse_score: number;
    rerank_score: number;
    recency_days: number;
    doc_length: number;
    title_length: number;
    view_count: number;
    reaction_count: number;
    reply_count: number;
    trending_score: number;
    authority_score: number;
    title_exact_match: boolean;
    title_partial_match: boolean;
    connector_type: string;
    document_type: string;
    department_match: boolean;
    author_interaction_count: number;
    author_id?: string;
  }>;
  user_context?: {
    user_id: string;
    team_id: string;
    department?: string;
    search_count: number;
    click_count: number;
    avg_dwell_ms?: number;
    connector_weights: Record<string, number>;
    author_interactions: Record<string, number>;
  };
  top_k: number;
  model_version?: string;
}

const EngineLTRResponseSchema = z.object({
  results: z.array(
    z.object({
      doc_id: z.string(),
      score: z.number(),
      features: z.record(z.string(), z.number()),
    })
  ),
  elapsed_ms: z.number(),
  model_version: z.string(),
  feature_count: z.number(),
});

const EngineLTRHealthResponseSchema = z.object({
  ready: z.boolean(),
  model_version: z.string(),
  feature_count: z.number(),
});

const LTR_TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 5000;

interface CallLTROptions {
  query: string;
  documents: DocumentFeatures[];
  userContext?: UserContext;
  topK: number;
  modelVersion?: string;
}

function toSnakeCase(doc: DocumentFeatures): EngineLTRRequest["documents"][0] {
  return {
    doc_id: doc.docId,
    bm25_title: doc.bm25Title,
    bm25_content: doc.bm25Content,
    dense_score: doc.denseScore,
    sparse_score: doc.sparseScore,
    rerank_score: doc.rerankScore,
    recency_days: doc.recencyDays,
    doc_length: doc.docLength,
    title_length: doc.titleLength,
    view_count: doc.viewCount,
    reaction_count: doc.reactionCount,
    reply_count: doc.replyCount,
    trending_score: doc.trendingScore,
    authority_score: doc.authorityScore,
    title_exact_match: doc.titleExactMatch,
    title_partial_match: doc.titlePartialMatch,
    connector_type: doc.connectorType,
    document_type: doc.documentType,
    department_match: doc.departmentMatch,
    author_interaction_count: doc.authorInteractionCount,
    author_id: doc.authorId,
  };
}

export async function callLTR(options: CallLTROptions): Promise<LTRResponse> {
  const { query, documents, userContext, topK, modelVersion } = options;
  const config = getConfig();
  const { baseURL } = config.engine;

  const body: EngineLTRRequest = {
    query,
    documents: documents.map(toSnakeCase),
    top_k: topK,
    model_version: modelVersion,
  };

  if (userContext) {
    body.user_context = {
      user_id: userContext.userId,
      team_id: userContext.teamId,
      department: userContext.department,
      search_count: userContext.searchCount,
      click_count: userContext.clickCount,
      avg_dwell_ms: userContext.avgDwellMs,
      connector_weights: userContext.connectorWeights,
      author_interactions: userContext.authorInteractions,
    };
  }

  const response = await fetch(`${baseURL}/v1/ltr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LTR_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`LTR failed: ${response.status} ${response.statusText}`);
  }

  const data = EngineLTRResponseSchema.parse(await response.json());

  return {
    results: data.results.map((r) => ({
      docId: r.doc_id,
      score: r.score,
      features: r.features,
    })),
    elapsedMs: data.elapsed_ms,
    modelVersion: data.model_version,
    featureCount: data.feature_count,
  };
}

export async function getLTRHealth(): Promise<LTRHealth> {
  const config = getConfig();
  const { baseURL } = config.engine;

  const response = await fetch(`${baseURL}/v1/ltr/health`, {
    signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`LTR health check failed: ${response.status}`);
  }

  const data = EngineLTRHealthResponseSchema.parse(await response.json());

  return {
    ready: data.ready,
    modelVersion: data.model_version,
    featureCount: data.feature_count,
  };
}
