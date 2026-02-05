import { RerankNodeConfigSchema } from "@openplane/types/canvas";
import { rerankerService } from "../../search/reranking/service";
import type {
  RerankDocument,
  RerankResponse,
} from "../../search/reranking/types";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const TEXT_KEYS = ["content", "text", "body", "snippet", "summary", "message"];

type RerankPayload = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function extractContentFromRecord(record: Record<string, unknown>): string {
  for (const key of TEXT_KEYS) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  const nested = [record.data, record.document, record.chunk];
  for (const entry of nested) {
    if (isRecord(entry)) {
      const nestedContent = extractContentFromRecord(entry);
      if (nestedContent) {
        return nestedContent;
      }
    }
  }

  return "";
}

function resolveDocumentId(
  record: Record<string, unknown>,
  index: number
): string {
  if (typeof record.id === "string" && record.id.trim()) {
    return record.id;
  }
  if (typeof record.documentId === "string" && record.documentId.trim()) {
    return record.documentId;
  }
  if (typeof record.chunkId === "string" && record.chunkId.trim()) {
    return record.chunkId;
  }
  if (typeof record.externalId === "string" && record.externalId.trim()) {
    return record.externalId;
  }
  return `doc-${index + 1}`;
}

function resolveDocumentTitle(
  record: Record<string, unknown>
): string | undefined {
  if (typeof record.title === "string" && record.title.trim()) {
    return record.title.trim();
  }
  if (typeof record.documentTitle === "string" && record.documentTitle.trim()) {
    return record.documentTitle.trim();
  }
  if (typeof record.name === "string" && record.name.trim()) {
    return record.name.trim();
  }
  return;
}

function resolveDocumentScore(
  record: Record<string, unknown>
): number | undefined {
  const candidates = [
    record.score,
    record.relevanceScore,
    record.relevance,
    record.rerankScore,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return;
}

function resolveDocumentRank(
  record: Record<string, unknown>
): number | undefined {
  const candidates = [record.rank, record.rerankRank];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return;
}

function toRerankDocument(
  value: unknown,
  index: number
): { doc: RerankDocument; payload: RerankPayload } | null {
  if (typeof value === "string") {
    const content = value.trim();
    if (!content) {
      return null;
    }
    const id = `doc-${index + 1}`;
    return {
      doc: { id, content },
      payload: { id, content },
    };
  }

  if (!isRecord(value)) {
    const content = normalizeText(value);
    if (!content) {
      return null;
    }
    const id = `doc-${index + 1}`;
    return {
      doc: { id, content },
      payload: { id, content, value },
    };
  }

  const id = resolveDocumentId(value, index);
  const content = extractContentFromRecord(value);
  if (!content) {
    return null;
  }

  const doc: RerankDocument = {
    id,
    content,
    title: resolveDocumentTitle(value),
    score: resolveDocumentScore(value),
    rank: resolveDocumentRank(value),
  };

  return {
    doc,
    payload: { ...value, id },
  };
}

function resolveDocuments(
  input: unknown
): Array<{ doc: RerankDocument; payload: RerankPayload }> {
  const items: unknown[] = [];

  if (Array.isArray(input)) {
    items.push(...input);
  } else if (isRecord(input)) {
    if (Array.isArray(input.documents)) {
      items.push(...input.documents);
    } else if (Array.isArray(input.items)) {
      items.push(...input.items);
    } else if (Array.isArray(input.results)) {
      items.push(...input.results);
    } else if (Array.isArray(input.chunks)) {
      items.push(...input.chunks);
    }
  }

  const resolved: Array<{ doc: RerankDocument; payload: RerankPayload }> = [];
  for (let index = 0; index < items.length; index += 1) {
    const entry = toRerankDocument(items[index], index);
    if (entry) {
      resolved.push(entry);
    }
  }

  return resolved;
}

function resolveQuery(input: unknown): string {
  if (typeof input === "string") {
    return input.trim();
  }
  if (!isRecord(input)) {
    return "";
  }

  const direct = input.query;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const candidates = [
    input.prompt,
    input.input,
    input.text,
    input.message,
    input.content,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function sortFallback(
  docs: Array<{ doc: RerankDocument; payload: RerankPayload }>,
  topK: number
): Array<{ doc: RerankDocument; payload: RerankPayload }> {
  const sorted = [...docs].sort((a, b) => {
    const scoreA = a.doc.score ?? 0;
    const scoreB = b.doc.score ?? 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const rankA = a.doc.rank ?? Number.POSITIVE_INFINITY;
    const rankB = b.doc.rank ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return 0;
  });
  return sorted.slice(0, topK);
}

function applyThreshold(
  results: RerankResponse["results"],
  threshold?: number
): RerankResponse["results"] {
  if (threshold === undefined) {
    return results;
  }
  return results.filter((result) => result.score >= threshold);
}

function buildOutput(params: {
  query: string;
  results: RerankResponse["results"];
  documentsById: Map<string, RerankPayload>;
  includeScores: boolean;
  model?: string;
  rerankTimeMs?: number;
}): Record<string, unknown> {
  const documents = params.results.flatMap((result, index) => {
    const payload = params.documentsById.get(result.id);
    if (!payload) {
      return [];
    }
    if (!params.includeScores) {
      return [{ ...payload }];
    }
    return [
      {
        ...payload,
        rerankScore: result.score,
        rerankRank: index + 1,
        originalScore: result.originalScore ?? undefined,
        originalRank: result.originalRank ?? undefined,
      },
    ];
  });

  return {
    query: params.query,
    documents,
    model: params.model,
    rerankTimeMs: params.rerankTimeMs,
    reranked: true,
  };
}

function buildFallbackOutput(params: {
  query: string;
  docs: Array<{ doc: RerankDocument; payload: RerankPayload }>;
  includeScores: boolean;
  model?: string;
}): Record<string, unknown> {
  const documents = params.docs.map((entry, index) => {
    if (!params.includeScores) {
      return { ...entry.payload };
    }
    return {
      ...entry.payload,
      rerankScore: entry.doc.score ?? 0,
      rerankRank: index + 1,
      originalScore: entry.doc.score ?? undefined,
      originalRank: entry.doc.rank ?? undefined,
    };
  });

  return {
    query: params.query,
    documents,
    model: params.model,
    rerankTimeMs: 0,
    reranked: false,
  };
}

export const rerankExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = RerankNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const query = resolveQuery(input);
    if (!query) {
      throw new Error("Rerank query is required");
    }

    const resolved = resolveDocuments(input);
    if (resolved.length === 0) {
      throw new Error("Rerank documents are required");
    }

    const topK = Math.max(1, config.topK ?? resolved.length);
    const fallbackDocs = sortFallback(resolved, topK);
    const response = await rerankerService.rerank(
      query,
      resolved.map((entry) => entry.doc),
      topK
    );

    if (!response) {
      return buildFallbackOutput({
        query,
        docs: fallbackDocs,
        includeScores: config.returnScores,
        model: config.model,
      });
    }

    const filtered = applyThreshold(response.results, config.threshold);
    const documentsById = new Map(
      resolved.map((entry) => [entry.doc.id, entry.payload])
    );

    return buildOutput({
      query,
      results: filtered,
      documentsById,
      includeScores: config.returnScores,
      model: response.model,
      rerankTimeMs: response.elapsedMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
