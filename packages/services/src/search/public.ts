import { getConfig as getAIConfig, getBGEM3Provider } from "@openbeam/ai";
import { PUBLIC_TEAM_ID } from "@openbeam/types/public";
import {
  buildVectorQueryFeatures,
  type DocumentRankingProfile,
  type GenericDocument,
  vespaClient,
} from "@openbeam/vespa";
import { getOrGenerateEmbedding } from "../ai/embedding-cache";
import { logger } from "../lib/logger";

function escapeYql(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

export interface PublicSearchParams {
  query: string;
  connectorTypes?: string[];
  documentTypes?: string[];
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
}

export interface PublicSearchResult {
  documents: PublicSearchDocument[];
  total: number;
  timing: number;
}

export interface PublicSearchDocument {
  id: string;
  title: string;
  content: string;
  url?: string;
  documentType?: string;
  connectorType?: string;
  createdAt?: number;
  updatedAt?: number;
  relevance: number;
}

function pushContainsAny(
  conditions: string[],
  field: string,
  values?: string[]
): void {
  if (!values?.length) {
    return;
  }
  const safe = values.filter(Boolean);
  if (safe.length === 0) {
    return;
  }
  if (safe.length === 1) {
    conditions.push(
      `${field} contains "${escapeYql(safe[0]?.toLowerCase() ?? "")}"`
    );
    return;
  }
  const or = safe
    .map((t) => `${field} contains "${escapeYql(t.toLowerCase())}"`)
    .join(" or ");
  conditions.push(`(${or})`);
}

function buildPublicYql(
  params: PublicSearchParams,
  useVector: boolean
): string {
  const conditions: string[] = [
    `team_id contains "${escapeYql(PUBLIC_TEAM_ID)}"`,
    "is_public = true",
  ];
  const limit = params.limit ?? 20;

  if (useVector && params.query) {
    const vectorClause = `({targetHits:${limit * 2}}nearestNeighbor(embedding, embedding_v2))`;
    const textClause = `default contains "${escapeYql(params.query)}"`;
    conditions.push(`(${vectorClause} or (${textClause}))`);
  } else if (params.query) {
    conditions.push(`(default contains "${escapeYql(params.query)}")`);
  }

  pushContainsAny(conditions, "connector_type", params.connectorTypes);
  pushContainsAny(conditions, "document_type", params.documentTypes);

  if (params.fromDate) {
    conditions.push(`created_at >= ${params.fromDate}`);
  }
  if (params.toDate) {
    conditions.push(`created_at <= ${params.toDate}`);
  }

  const offset = params.offset ?? 0;
  return `select * from openbeam_document where ${conditions.join(" and ")} limit ${limit} offset ${offset}`;
}

function mapDocument(
  doc: GenericDocument,
  relevance: number
): PublicSearchDocument {
  return {
    id: doc.id,
    title: doc.title ?? "",
    content: doc.content ?? "",
    url: doc.url ?? undefined,
    documentType: doc.document_type ?? undefined,
    connectorType: doc.connector_type ?? undefined,
    createdAt: doc.created_at ?? undefined,
    updatedAt: doc.updated_at ?? undefined,
    relevance,
  };
}

export async function publicSearch(
  params: PublicSearchParams
): Promise<PublicSearchResult> {
  const startTime = Date.now();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const offset = Math.max(params.offset ?? 0, 0);
  const bounded = { ...params, limit, offset };

  let rankingProfile: DocumentRankingProfile = "bm25";
  let vectorFeatures: ReturnType<typeof buildVectorQueryFeatures> | undefined;
  let hasEmbedding = false;

  const aiConfig = getAIConfig();

  if (params.query.trim().length > 0) {
    try {
      const provider = getBGEM3Provider();
      const embedding = await getOrGenerateEmbedding(
        params.query,
        aiConfig.defaultEmbeddingModel,
        async () => {
          const result = await provider.embedQuery(params.query);
          return result.dense;
        }
      );
      if (embedding) {
        hasEmbedding = true;
        rankingProfile = "hybrid_v2";
        vectorFeatures = buildVectorQueryFeatures(embedding);
      }
    } catch {
      logger.warn("BGE-M3 embedding unavailable, falling back to BM25");
    }
  }

  const yql = buildPublicYql(bounded, hasEmbedding);

  const result = await vespaClient.query<GenericDocument>({
    yql,
    hits: limit,
    offset,
    ranking: rankingProfile,
    ...vectorFeatures,
  });

  const documents: PublicSearchDocument[] = (result.root?.children ?? []).map(
    (hit) => mapDocument(hit.fields, hit.relevance ?? 0)
  );

  const total = result.root?.fields?.totalCount ?? documents.length;
  const timing = Date.now() - startTime;

  logger.debug(
    { query: params.query, results: documents.length, total, timing },
    "Public search"
  );

  return { documents, total, timing };
}
