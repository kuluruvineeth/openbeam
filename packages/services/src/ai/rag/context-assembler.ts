import { estimateTokens } from "@openplane/ai";
import type {
  AssembledContext,
  ContextAssemblyConfig,
  ConversationContext,
  QueryAnalysis,
  RAGChunk,
  RAGCitation,
} from "./types";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for enterprise search. Answer questions using ONLY the provided context documents.

Rules:
- Answer from context only. If information is insufficient, say so clearly.
- Cite sources using [N] notation where N corresponds to the document number.
- Be concise and direct. Prefer bullet points for lists.
- Never fabricate information not present in the context.
- If asked about something outside the context, acknowledge the limitation.`;

const DEFAULT_CONFIG: ContextAssemblyConfig = {
  maxContextTokens: 12_000,
  reserveAnswerTokens: 4000,
  includeMetadata: true,
  hierarchical: true,
};

interface DocumentGroup {
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  connectorType: string;
  chunks: RAGChunk[];
  totalTokens: number;
}

interface SelectionResult {
  selectedChunks: RAGChunk[];
  citationMap: Map<string, RAGCitation>;
  budgetUsed: number;
}

function createCitation(chunk: RAGChunk, position: number): RAGCitation {
  return {
    id: `cite_${position}`,
    chunkId: chunk.id,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    documentUrl: chunk.documentUrl,
    connectorType: chunk.connectorType,
    snippet: chunk.content.slice(0, 200),
    relevanceScore: chunk.score,
    position,
  };
}

function selectChunksFlat(chunks: RAGChunk[], budget: number): SelectionResult {
  const selectedChunks: RAGChunk[] = [];
  const citationMap = new Map<string, RAGCitation>();
  let remaining = budget;
  let citationIdx = 1;

  for (const chunk of chunks) {
    if (chunk.tokenCount <= remaining) {
      selectedChunks.push(chunk);
      remaining -= chunk.tokenCount;
      citationMap.set(chunk.id, createCitation(chunk, citationIdx));
      citationIdx += 1;
    }
  }

  return { selectedChunks, citationMap, budgetUsed: budget - remaining };
}

function selectChunksHierarchical(
  chunks: RAGChunk[],
  budget: number
): SelectionResult {
  const groups = groupChunksByDocument(chunks);
  const selectedChunks: RAGChunk[] = [];
  const citationMap = new Map<string, RAGCitation>();
  let remaining = budget;
  let citationIdx = 1;

  for (const group of groups) {
    if (remaining <= 0) {
      break;
    }

    for (const chunk of group.chunks) {
      if (chunk.tokenCount <= remaining) {
        selectedChunks.push(chunk);
        remaining -= chunk.tokenCount;
        citationMap.set(chunk.id, createCitation(chunk, citationIdx));
        citationIdx += 1;
      }
    }
  }

  return { selectedChunks, citationMap, budgetUsed: budget - remaining };
}

export function assembleContext(
  chunks: RAGChunk[],
  query: QueryAnalysis,
  conversationContext?: ConversationContext,
  config: Partial<ContextAssemblyConfig> = {}
): AssembledContext {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const availableTokens = opts.maxContextTokens - opts.reserveAnswerTokens;

  const systemPrompt = buildSystemPrompt(query, conversationContext);
  const systemTokens = estimateTokens(systemPrompt);
  const budget = availableTokens - systemTokens;

  if (budget <= 0) {
    return {
      systemPrompt,
      contextText: "",
      chunks: [],
      totalTokens: systemTokens,
      truncated: true,
      citationMap: new Map(),
    };
  }

  const { selectedChunks, citationMap, budgetUsed } = opts.hierarchical
    ? selectChunksHierarchical(chunks, budget)
    : selectChunksFlat(chunks, budget);

  const contextText = formatContextText(selectedChunks, opts.includeMetadata);

  return {
    systemPrompt,
    contextText,
    chunks: selectedChunks,
    totalTokens: systemTokens + budgetUsed,
    truncated: selectedChunks.length < chunks.length,
    citationMap,
  };
}

function buildSystemPrompt(
  query: QueryAnalysis,
  conversationContext?: ConversationContext
): string {
  let prompt = DEFAULT_SYSTEM_PROMPT;

  if (conversationContext?.summary) {
    prompt += `\n\nConversation Summary:\n${conversationContext.summary}`;
  }

  if (query.temporalContext) {
    prompt += `\n\nTemporal Focus: ${query.temporalContext.description}`;
  }

  if (query.entities.length > 0) {
    const entityList = query.entities
      .map((e) => `${e.text} (${e.type})`)
      .join(", ");
    prompt += `\n\nKey Entities: ${entityList}`;
  }

  return prompt;
}

function groupChunksByDocument(chunks: RAGChunk[]): DocumentGroup[] {
  const groups = new Map<string, DocumentGroup>();

  for (const chunk of chunks) {
    const existing = groups.get(chunk.documentId);
    if (existing) {
      existing.chunks.push(chunk);
      existing.totalTokens += chunk.tokenCount;
    } else {
      groups.set(chunk.documentId, {
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        documentUrl: chunk.documentUrl,
        connectorType: chunk.connectorType,
        chunks: [chunk],
        totalTokens: chunk.tokenCount,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aMaxScore = Math.max(...a.chunks.map((c) => c.score));
    const bMaxScore = Math.max(...b.chunks.map((c) => c.score));
    return bMaxScore - aMaxScore;
  });
}

function buildDocHeader(
  first: RAGChunk,
  docIndex: number,
  includeMetadata: boolean
): string {
  let header = `[${docIndex}] ${first.documentTitle}`;

  if (includeMetadata) {
    const meta: string[] = [];
    if (first.connectorType) {
      meta.push(`Source: ${first.connectorType}`);
    }
    if (first.documentUrl) {
      meta.push(`URL: ${first.documentUrl}`);
    }
    if (meta.length > 0) {
      header += `\n(${meta.join(" | ")})`;
    }
  }

  return header;
}

function formatContextText(
  chunks: RAGChunk[],
  includeMetadata: boolean
): string {
  const docChunks = new Map<string, RAGChunk[]>();

  for (const chunk of chunks) {
    const existing = docChunks.get(chunk.documentId) ?? [];
    existing.push(chunk);
    docChunks.set(chunk.documentId, existing);
  }

  const sections: string[] = [];
  let docIndex = 1;

  for (const [, docChunkList] of docChunks) {
    const first = docChunkList[0];
    if (!first) {
      continue;
    }

    const header = buildDocHeader(first, docIndex, includeMetadata);
    const content = docChunkList
      .sort((a, b) => a.startOffset - b.startOffset)
      .map((c) => c.content)
      .join("\n\n");

    sections.push(`${header}\n${content}`);
    docIndex += 1;
  }

  return sections.join("\n\n---\n\n");
}

export function computeTokenBudget(
  modelMaxTokens: number,
  reserveForAnswer: number,
  systemPromptTokens: number
): number {
  return modelMaxTokens - reserveForAnswer - systemPromptTokens;
}
