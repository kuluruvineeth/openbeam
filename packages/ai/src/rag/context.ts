import { estimateTokens } from "../embeddings/chunker";
import type {
  ChunkingOptions,
  ConversationContext,
  QueryAnalysis,
  RAGChunk,
  RAGCitation,
  RAGConfig,
  RAGContext,
  RerankingOptions,
} from "./types";

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z])/;
const PARAGRAPH_BOUNDARY = /\n\s*\n/;
const WHITESPACE = /\s+/;
const NON_WORD = /[^\w\s]/g;

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for enterprise search. Answer questions using ONLY the provided context documents.

Rules:
- Answer from context only. If information is insufficient, say so clearly.
- Cite sources using [N] notation where N corresponds to the document number.
- Be concise and direct. Prefer bullet points for lists.
- Never fabricate information not present in the context.
- If asked about something outside the context, acknowledge the limitation.`;

interface RawChunk {
  text: string;
  start: number;
  end: number;
}

interface DocumentGroup {
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  sourceType: string;
  chunks: RAGChunk[];
  maxScore: number;
}

function createCitation(chunk: RAGChunk, position: number): RAGCitation {
  return {
    id: `cite_${position}`,
    chunkId: chunk.id,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    documentUrl: chunk.documentUrl,
    sourceType: chunk.sourceType,
    snippet: chunk.content.slice(0, 200),
    relevanceScore: chunk.score,
    position,
    pageNumber: chunk.pageNumber,
    pageRange: chunk.pageRange,
    sectionPath: chunk.sectionPath,
    sectionTitle: chunk.sectionTitle,
  };
}

interface ExtractChunksParams {
  text: string;
  documentId: string;
  documentTitle: string;
  sourceType: string;
  options?: Partial<ChunkingOptions>;
  documentUrl?: string;
}

export function extractChunksFromText(params: ExtractChunksParams): RAGChunk[] {
  const { text, documentId, documentTitle, sourceType, documentUrl } = params;
  const options = params.options ?? {};
  const opts: ChunkingOptions = {
    maxChunkSize: options.maxChunkSize ?? 512,
    chunkOverlap: options.chunkOverlap ?? 50,
    minChunkSize: options.minChunkSize ?? 100,
    splitOn: options.splitOn ?? "sentence",
  };

  if (!text.trim()) {
    return [];
  }

  const rawChunks = splitText(text, opts);

  return rawChunks.map((chunk, idx) => ({
    id: `${documentId}_chunk_${idx}`,
    documentId,
    documentTitle,
    documentUrl,
    sourceType,
    content: chunk.text,
    startOffset: chunk.start,
    endOffset: chunk.end,
    score: 1 - idx * 0.05,
    tokenCount: estimateTokens(chunk.text),
  }));
}

function splitText(text: string, opts: ChunkingOptions): RawChunk[] {
  switch (opts.splitOn) {
    case "paragraph":
      return splitByParagraph(text, opts);
    case "token":
      return splitByTokenCount(text, opts);
    default:
      return splitBySentence(text, opts);
  }
}

interface SentenceChunkState {
  buffer: string;
  bufferStart: number;
  paragraphOffset: number;
  positionInParagraph: number;
}

interface ProcessSentenceParams {
  sentence: string;
  state: SentenceChunkState;
  opts: ChunkingOptions;
  chunks: RawChunk[];
}

function processSentenceIntoChunks(params: ProcessSentenceParams): void {
  const { sentence, state, opts, chunks } = params;
  const potentialLength = state.buffer.length + sentence.length + 1;
  const shouldFlush =
    potentialLength > opts.maxChunkSize &&
    state.buffer.length >= opts.minChunkSize;

  if (shouldFlush) {
    const chunkEnd = state.paragraphOffset + state.positionInParagraph;
    chunks.push({
      text: state.buffer.trim(),
      start: state.bufferStart,
      end: chunkEnd,
    });

    const previousBufferLength = state.buffer.length;
    const overlapStart = Math.max(0, previousBufferLength - opts.chunkOverlap);
    const overlapText = state.buffer.slice(overlapStart);
    state.buffer = `${overlapText} ${sentence}`;
    state.bufferStart =
      state.paragraphOffset +
      state.positionInParagraph -
      previousBufferLength +
      overlapStart;
    state.positionInParagraph =
      state.bufferStart - state.paragraphOffset + state.buffer.length;
  } else {
    const previousBufferLength = state.buffer.length;
    state.buffer = state.buffer ? `${state.buffer} ${sentence}` : sentence;
    if (previousBufferLength === 0) {
      state.positionInParagraph = state.buffer.length;
    } else {
      state.positionInParagraph += 1 + sentence.length;
    }
  }
}

function splitBySentence(text: string, opts: ChunkingOptions): RawChunk[] {
  const paragraphs = text.split(PARAGRAPH_BOUNDARY).filter((p) => p.trim());
  const chunks: RawChunk[] = [];
  let offset = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (trimmed.length < opts.minChunkSize) {
      offset += paragraph.length + 2;
      continue;
    }

    if (trimmed.length <= opts.maxChunkSize) {
      chunks.push({
        text: trimmed,
        start: offset,
        end: offset + trimmed.length,
      });
      offset += paragraph.length + 2;
      continue;
    }

    const sentences = trimmed.split(SENTENCE_BOUNDARY);
    const state: SentenceChunkState = {
      buffer: "",
      bufferStart: offset,
      paragraphOffset: offset,
      positionInParagraph: 0,
    };

    for (const sentence of sentences) {
      processSentenceIntoChunks({ sentence, state, opts, chunks });
    }

    if (state.buffer.trim().length >= opts.minChunkSize) {
      const finalChunkEnd = state.paragraphOffset + state.positionInParagraph;
      chunks.push({
        text: state.buffer.trim(),
        start: state.bufferStart,
        end: finalChunkEnd,
      });
    }

    offset += paragraph.length + 2;
  }

  return chunks;
}

interface ParagraphChunkState {
  buffer: string;
  bufferStart: number;
  offset: number;
}

function appendParagraphToBuffer(
  trimmed: string,
  state: ParagraphChunkState,
  opts: ChunkingOptions,
  chunks: RawChunk[]
): void {
  const canAppend =
    state.buffer.length + trimmed.length + 2 <= opts.maxChunkSize;

  if (canAppend) {
    if (state.buffer.length === 0) {
      state.bufferStart = state.offset;
    }
    state.buffer = state.buffer ? `${state.buffer}\n\n${trimmed}` : trimmed;
  } else {
    if (state.buffer.length >= opts.minChunkSize) {
      chunks.push({
        text: state.buffer,
        start: state.bufferStart,
        end: state.offset,
      });
    }
    state.buffer = trimmed;
    state.bufferStart = state.offset;
  }
}

function splitByParagraph(text: string, opts: ChunkingOptions): RawChunk[] {
  const paragraphs = text.split(PARAGRAPH_BOUNDARY).filter((p) => p.trim());
  const chunks: RawChunk[] = [];
  const state: ParagraphChunkState = { buffer: "", bufferStart: 0, offset: 0 };

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (trimmed.length >= opts.minChunkSize) {
      appendParagraphToBuffer(trimmed, state, opts, chunks);
    }
    state.offset += paragraph.length + 2;
  }

  if (state.buffer.length >= opts.minChunkSize) {
    chunks.push({
      text: state.buffer,
      start: state.bufferStart,
      end: state.offset,
    });
  }

  return chunks;
}

function splitByTokenCount(text: string, opts: ChunkingOptions): RawChunk[] {
  const chunks: RawChunk[] = [];
  let startOffset = 0;

  while (startOffset < text.length) {
    const endOffset = Math.min(
      startOffset + opts.maxChunkSize * 4,
      text.length
    );
    const chunkText = text.slice(startOffset, endOffset).trim();

    if (chunkText.length >= opts.minChunkSize) {
      chunks.push({ text: chunkText, start: startOffset, end: endOffset });
    }

    startOffset = endOffset - opts.chunkOverlap * 4;
    if (startOffset <= 0 || startOffset >= text.length) {
      break;
    }
  }

  return chunks;
}

function countTermOverlap(terms: string[], queryTermSet: Set<string>): number {
  let count = 0;
  for (const term of terms) {
    if (queryTermSet.has(term)) {
      count += 1;
    }
  }
  return count;
}

function buildSectionCoherenceMap(chunks: RAGChunk[]): Map<string, number> {
  const sectionCounts = new Map<string, number>();
  for (const chunk of chunks) {
    if (chunk.sectionId) {
      const key = `${chunk.documentId}:${chunk.sectionId}`;
      sectionCounts.set(key, (sectionCounts.get(key) ?? 0) + 1);
    }
  }
  return sectionCounts;
}

function computeChunkScore(
  chunk: RAGChunk,
  queryTerms: string[],
  queryTermSet: Set<string>,
  sectionCoherence: Map<string, number>
): number {
  const chunkTerms = normalizeAndTokenize(chunk.content);
  const titleTerms = normalizeAndTokenize(chunk.documentTitle);

  const termOverlap = countTermOverlap(chunkTerms, queryTermSet);
  const titleBoost = countTermOverlap(titleTerms, queryTermSet) * 0.1;

  let sectionBoost = 0;
  if (chunk.sectionTitle) {
    const sectionTerms = normalizeAndTokenize(chunk.sectionTitle);
    sectionBoost = countTermOverlap(sectionTerms, queryTermSet) * 0.15;
  }

  const structureBonus =
    chunk.sectionPath && chunk.sectionPath.length > 0 ? 0.05 : 0;

  let coherenceBonus = 0;
  if (chunk.sectionId) {
    const sectionKey = `${chunk.documentId}:${chunk.sectionId}`;
    const sectionCount = sectionCoherence.get(sectionKey) ?? 0;
    if (sectionCount > 1) {
      coherenceBonus = 0.05 * Math.min(sectionCount - 1, 3);
    }
  }

  const termScore = termOverlap / Math.max(queryTerms.length, 1);
  const positionBonus = chunk.startOffset < 500 ? 0.1 : 0;
  const lengthPenalty = chunk.content.length < 100 ? -0.05 : 0;

  return (
    chunk.score * 0.3 +
    termScore * 0.5 +
    titleBoost +
    sectionBoost +
    structureBonus +
    coherenceBonus +
    positionBonus +
    lengthPenalty
  );
}

function selectTopChunks(
  scored: { chunk: RAGChunk; rerankScore: number }[],
  topK: number,
  minScore: number,
  diversityWeight: number
): RAGChunk[] {
  const selected: RAGChunk[] = [];
  const selectedDocs = new Set<string>();

  for (const { chunk, rerankScore } of scored) {
    if (selected.length >= topK) {
      break;
    }
    if (rerankScore < minScore) {
      continue;
    }

    const diversityBonus = selectedDocs.has(chunk.documentId)
      ? 0
      : diversityWeight;
    const finalScore = rerankScore + diversityBonus;

    if (finalScore >= minScore) {
      selected.push({ ...chunk, score: finalScore });
      selectedDocs.add(chunk.documentId);
    }
  }

  return selected;
}

export function rerankChunks(
  query: string,
  chunks: RAGChunk[],
  options: Partial<RerankingOptions> = {}
): RAGChunk[] {
  const topK = options.topK ?? 10;
  const minScore = options.minScore ?? 0.1;
  const diversityWeight = options.diversityWeight ?? 0.3;

  if (chunks.length <= topK) {
    return chunks.filter((c) => c.score >= minScore);
  }

  const queryTerms = normalizeAndTokenize(query);
  const queryTermSet = new Set(queryTerms);
  const sectionCoherence = buildSectionCoherenceMap(chunks);

  const scored = chunks.map((chunk) => ({
    chunk,
    rerankScore: computeChunkScore(
      chunk,
      queryTerms,
      queryTermSet,
      sectionCoherence
    ),
  }));

  scored.sort((a, b) => b.rerankScore - a.rerankScore);

  return selectTopChunks(scored, topK, minScore, diversityWeight);
}

function normalizeAndTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(NON_WORD, " ")
    .split(WHITESPACE)
    .filter((t) => t.length > 2);
}

export function buildContext(
  chunks: RAGChunk[],
  query: QueryAnalysis,
  config: Partial<RAGConfig> = {},
  conversationContext?: ConversationContext
): RAGContext {
  const maxContextTokens = config.maxContextTokens ?? 8000;
  const reserveAnswerTokens = config.reserveAnswerTokens ?? 2000;
  const includeMetadata = config.includeMetadata ?? true;
  const citationStyle = config.citationStyle ?? "inline";

  const systemPrompt = buildSystemPrompt(
    query,
    conversationContext,
    citationStyle
  );
  const systemTokens = estimateTokens(systemPrompt);
  const budget = maxContextTokens - reserveAnswerTokens - systemTokens;

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

  const { selectedChunks, citationMap, tokensUsed } = selectChunksWithinBudget(
    chunks,
    budget
  );

  const contextText = formatContextText(
    selectedChunks,
    includeMetadata,
    citationStyle
  );

  return {
    systemPrompt,
    contextText,
    chunks: selectedChunks,
    totalTokens: systemTokens + tokensUsed,
    truncated: selectedChunks.length < chunks.length,
    citationMap,
  };
}

function buildSystemPrompt(
  query: QueryAnalysis,
  conversationContext?: ConversationContext,
  citationStyle: "inline" | "footnote" | "endnote" = "inline"
): string {
  let prompt = DEFAULT_SYSTEM_PROMPT;

  if (citationStyle === "footnote") {
    prompt = prompt.replace(
      "using [N] notation",
      "using superscript numbers that reference footnotes"
    );
  } else if (citationStyle === "endnote") {
    prompt = prompt.replace(
      "using [N] notation",
      "using numbered references collected at the end"
    );
  }

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

interface SelectionResult {
  selectedChunks: RAGChunk[];
  citationMap: Map<string, RAGCitation>;
  tokensUsed: number;
}

function selectChunksWithinBudget(
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

  return { selectedChunks, citationMap, tokensUsed: budget - remaining };
}

function groupChunksByDocument(chunks: RAGChunk[]): DocumentGroup[] {
  const groups = new Map<string, DocumentGroup>();

  for (const chunk of chunks) {
    const existing = groups.get(chunk.documentId);
    if (existing) {
      existing.chunks.push(chunk);
      existing.maxScore = Math.max(existing.maxScore, chunk.score);
    } else {
      groups.set(chunk.documentId, {
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        documentUrl: chunk.documentUrl,
        sourceType: chunk.sourceType,
        chunks: [chunk],
        maxScore: chunk.score,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.maxScore - a.maxScore);
}

function formatContextText(
  chunks: RAGChunk[],
  includeMetadata: boolean,
  _citationStyle: "inline" | "footnote" | "endnote"
): string {
  const docChunks = new Map<string, RAGChunk[]>();

  for (const chunk of chunks) {
    const existing = docChunks.get(chunk.documentId) ?? [];
    existing.push(chunk);
    docChunks.set(chunk.documentId, existing);
  }

  const sections: string[] = [];
  let docIndex = 1;

  for (const [, chunkList] of docChunks) {
    const first = chunkList[0];
    if (!first) {
      continue;
    }

    const header = buildDocHeader(first, docIndex, includeMetadata);
    const content = chunkList
      .sort((a, b) => a.startOffset - b.startOffset)
      .map((c) => c.content)
      .join("\n\n");

    sections.push(`${header}\n${content}`);
    docIndex += 1;
  }

  return sections.join("\n\n---\n\n");
}

function buildDocHeader(
  chunk: RAGChunk,
  docIndex: number,
  includeMetadata: boolean
): string {
  const titleParts = [chunk.documentTitle];
  if (chunk.sectionTitle) {
    titleParts.push(chunk.sectionTitle);
  }
  let header = `[${docIndex}] ${titleParts.join(" > ")}`;

  if (includeMetadata) {
    const meta: string[] = [];
    if (chunk.sourceType) {
      meta.push(`Source: ${chunk.sourceType}`);
    }
    if (chunk.pageNumber) {
      meta.push(`Page ${chunk.pageNumber}`);
    }
    if (chunk.documentUrl) {
      meta.push(`URL: ${chunk.documentUrl}`);
    }
    if (meta.length > 0) {
      header += `\n(${meta.join(" | ")})`;
    }
  }

  return header;
}

export function computeTokenBudget(
  modelMaxTokens: number,
  reserveForAnswer: number,
  systemPromptTokens: number
): number {
  return Math.max(0, modelMaxTokens - reserveForAnswer - systemPromptTokens);
}

export function getCitationsFromText(
  text: string,
  citationMap: Map<string, RAGCitation>
): RAGCitation[] {
  const citationPattern = /\[(\d+)\]/g;
  const usedCitations: RAGCitation[] = [];
  const usedPositions = new Set<number>();

  const matches = text.matchAll(citationPattern);
  for (const match of matches) {
    const position = Number.parseInt(match[1] ?? "0", 10);
    if (position > 0 && !usedPositions.has(position)) {
      usedPositions.add(position);
      for (const citation of citationMap.values()) {
        if (citation.position === position) {
          usedCitations.push(citation);
          break;
        }
      }
    }
  }

  return usedCitations.sort((a, b) => a.position - b.position);
}
