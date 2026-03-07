import { estimateTokens } from "@openbeam/ai";
import type { GenericDocument } from "@openbeam/vespa";
import type { ChunkExtractionOptions, RAGChunk } from "./types";

const DEFAULT_CHUNK_OPTIONS: ChunkExtractionOptions = {
  maxChunksPerDoc: 5,
  chunkSize: 500,
  chunkOverlap: 100,
  minChunkSize: 50,
};

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z])/;
const PARAGRAPH_BOUNDARY = /\n\s*\n/;
const WHITESPACE = /\s+/;
const NON_WORD = /[^\w\s]/g;

interface RawChunk {
  text: string;
  start: number;
  end: number;
}

function chunkLongParagraph(
  paragraph: string,
  offset: number,
  opts: ChunkExtractionOptions
): RawChunk[] {
  const sentences = paragraph.split(SENTENCE_BOUNDARY);
  const chunks: RawChunk[] = [];
  let buffer = "";
  let bufferStart = offset;

  for (const sentence of sentences) {
    const potentialLength = buffer.length + sentence.length + 1;

    if (
      potentialLength > opts.chunkSize &&
      buffer.length >= opts.minChunkSize
    ) {
      chunks.push({
        text: buffer.trim(),
        start: bufferStart,
        end: offset + buffer.length,
      });

      const overlapStart = Math.max(0, buffer.length - opts.chunkOverlap);
      buffer = `${buffer.slice(overlapStart)} ${sentence}`;
      bufferStart = offset + overlapStart;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }

  if (buffer.trim().length >= opts.minChunkSize) {
    chunks.push({
      text: buffer.trim(),
      start: bufferStart,
      end: offset + paragraph.length,
    });
  }

  return chunks;
}

function processParagraph(
  paragraph: string,
  offset: number,
  opts: ChunkExtractionOptions
): { chunks: RawChunk[]; newOffset: number } {
  const trimmed = paragraph.trim();

  if (trimmed.length < opts.minChunkSize) {
    return { chunks: [], newOffset: offset + paragraph.length + 2 };
  }

  if (trimmed.length <= opts.chunkSize) {
    return {
      chunks: [{ text: trimmed, start: offset, end: offset + trimmed.length }],
      newOffset: offset + paragraph.length + 2,
    };
  }

  return {
    chunks: chunkLongParagraph(trimmed, offset, opts),
    newOffset: offset + paragraph.length + 2,
  };
}

export function extractChunks(
  document: GenericDocument,
  options: Partial<ChunkExtractionOptions> = {}
): RAGChunk[] {
  const opts = { ...DEFAULT_CHUNK_OPTIONS, ...options };
  const content = document.content ?? "";

  if (!content.trim()) {
    return [];
  }

  const paragraphs = content.split(PARAGRAPH_BOUNDARY).filter((p) => p.trim());
  const rawChunks: RawChunk[] = [];
  let offset = 0;

  for (const paragraph of paragraphs) {
    const result = processParagraph(paragraph, offset, opts);
    rawChunks.push(...result.chunks);
    offset = result.newOffset;
  }

  return rawChunks.slice(0, opts.maxChunksPerDoc).map((chunk, idx) => ({
    id: `${document.id}_chunk_${idx}`,
    documentId: document.id,
    documentTitle: document.title ?? "Untitled",
    documentUrl: document.url ?? undefined,
    connectorType: document.connector_type ?? "unknown",
    content: chunk.text,
    startOffset: chunk.start,
    endOffset: chunk.end,
    score: 1 - idx * 0.1,
    tokenCount: estimateTokens(chunk.text),
  }));
}

export function extractChunksFromDocuments(
  documents: GenericDocument[],
  scores: Map<string, number>,
  options: Partial<ChunkExtractionOptions> = {}
): RAGChunk[] {
  const allChunks: RAGChunk[] = [];

  for (const doc of documents) {
    const baseScore = scores.get(doc.id) ?? 0.5;
    const chunks = extractChunks(doc, options);

    for (const chunk of chunks) {
      chunk.score *= baseScore;
      allChunks.push(chunk);
    }
  }

  return allChunks.sort((a, b) => b.score - a.score);
}

interface RerankResult {
  chunk: RAGChunk;
  rerankScore: number;
}

export function rerankChunks(
  query: string,
  chunks: RAGChunk[],
  topK: number
): RAGChunk[] {
  if (chunks.length <= topK) {
    return chunks;
  }

  const scored = scoreChunksByRelevance(query, chunks);
  return scored.slice(0, topK).map((r) => ({
    ...r.chunk,
    score: r.rerankScore,
  }));
}

function scoreChunksByRelevance(
  query: string,
  chunks: RAGChunk[]
): RerankResult[] {
  const queryTerms = normalizeAndTokenize(query);
  const queryTermSet = new Set(queryTerms);

  return chunks
    .map((chunk) => {
      const chunkTerms = normalizeAndTokenize(chunk.content);
      const titleTerms = normalizeAndTokenize(chunk.documentTitle);

      let termOverlap = 0;
      for (const term of chunkTerms) {
        if (queryTermSet.has(term)) {
          termOverlap += 1;
        }
      }

      let titleBoost = 0;
      for (const term of titleTerms) {
        if (queryTermSet.has(term)) {
          titleBoost += 0.1;
        }
      }

      const termScore = termOverlap / Math.max(queryTerms.length, 1);
      const positionBonus = chunk.startOffset < 500 ? 0.1 : 0;
      const lengthPenalty = chunk.content.length < 100 ? -0.05 : 0;

      const rerankScore =
        chunk.score * 0.3 +
        termScore * 0.5 +
        titleBoost +
        positionBonus +
        lengthPenalty;

      return { chunk, rerankScore };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

function normalizeAndTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(NON_WORD, " ")
    .split(WHITESPACE)
    .filter((t) => t.length > 2);
}

function findBestChunkIndex(
  candidates: RAGChunk[],
  selectedDocs: Set<string>,
  diversityWeight: number
): number {
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < candidates.length; i += 1) {
    const chunk = candidates[i];
    if (!chunk) {
      continue;
    }

    const diversityBonus = selectedDocs.has(chunk.documentId)
      ? 0
      : diversityWeight;
    const combinedScore = chunk.score + diversityBonus;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestIdx = i;
    }
  }

  return bestIdx;
}

export function selectDiverse(
  chunks: RAGChunk[],
  topK: number,
  diversityWeight = 0.3
): RAGChunk[] {
  if (chunks.length <= topK) {
    return chunks;
  }

  const selected: RAGChunk[] = [];
  const selectedDocs = new Set<string>();

  const sortedByScore = [...chunks].sort((a, b) => b.score - a.score);

  while (selected.length < topK && sortedByScore.length > 0) {
    const bestIdx = findBestChunkIndex(
      sortedByScore,
      selectedDocs,
      diversityWeight
    );
    const chosen = sortedByScore[bestIdx];
    if (!chosen) {
      break;
    }

    selected.push(chosen);
    selectedDocs.add(chosen.documentId);
    sortedByScore.splice(bestIdx, 1);
  }

  return selected;
}
