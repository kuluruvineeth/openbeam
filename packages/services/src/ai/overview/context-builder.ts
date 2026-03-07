import type { GenericDocument } from "@openbeam/vespa";
import type {
  BuiltContext,
  ContextChunk,
  ContextDocument,
  OverviewConfig,
} from "./types";
import { DEFAULT_OVERVIEW_CONFIG } from "./types";

const CHARS_PER_TOKEN = 4;
const PARAGRAPH_SPLIT_PATTERN = /\n\n+/;
const WORD_SPLIT_PATTERN = /\s+/;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function extractChunks(content: string, maxChunks: number): ContextChunk[] {
  const paragraphs = content
    .split(PARAGRAPH_SPLIT_PATTERN)
    .filter((p) => p.trim().length > 50);

  if (paragraphs.length === 0) {
    return [
      {
        text: content.slice(0, 2000),
        startOffset: 0,
        endOffset: Math.min(content.length, 2000),
        score: 1.0,
      },
    ];
  }

  const chunks: ContextChunk[] = [];
  let offset = 0;

  for (const para of paragraphs.slice(0, maxChunks)) {
    const startOffset = content.indexOf(para, offset);
    chunks.push({
      text: para.slice(0, 1000),
      startOffset: startOffset >= 0 ? startOffset : offset,
      endOffset:
        startOffset >= 0 ? startOffset + para.length : offset + para.length,
      score: 1.0 - chunks.length * 0.1,
    });
    offset =
      startOffset >= 0 ? startOffset + para.length : offset + para.length;
  }

  return chunks;
}

export function buildContextDocuments(
  documents: GenericDocument[],
  scores: Map<string, number>,
  config: Partial<OverviewConfig> = {}
): ContextDocument[] {
  const { maxSources, minRelevanceScore } = {
    ...DEFAULT_OVERVIEW_CONFIG,
    ...config,
  };

  const contextDocs: ContextDocument[] = [];

  for (const doc of documents) {
    const score = scores.get(doc.id) ?? 0;
    if (score < minRelevanceScore) {
      continue;
    }

    const content = doc.content || "";
    if (content.length < 50) {
      continue;
    }

    const isMedia = doc.document_type === "media";
    contextDocs.push({
      id: doc.id,
      title: doc.title || "Untitled",
      content,
      url: doc.url || doc.source_path,
      connectorType: doc.connector_type,
      sourceType: isMedia ? "media" : "document",
      score,
      chunks: extractChunks(content, 3),
    });

    if (contextDocs.length >= maxSources) {
      break;
    }
  }

  return contextDocs;
}

export function buildContext(
  documents: ContextDocument[],
  config: Partial<OverviewConfig> = {}
): BuiltContext {
  const { maxTokens } = { ...DEFAULT_OVERVIEW_CONFIG, ...config };

  const parts: string[] = [];
  let totalTokens = 0;
  let truncated = false;
  const includedDocs: ContextDocument[] = [];

  for (const doc of documents) {
    const docContent =
      doc.chunks.length > 0
        ? doc.chunks.map((c) => c.text).join("\n\n")
        : doc.content;

    const formattedDoc = `[${includedDocs.length + 1}] ${doc.title}\n${docContent}`;
    const docTokens = estimateTokens(formattedDoc);

    if (totalTokens + docTokens > maxTokens) {
      truncated = true;
      break;
    }

    parts.push(formattedDoc);
    totalTokens += docTokens;
    includedDocs.push(doc);
  }

  return {
    text: parts.join("\n\n---\n\n"),
    documents: includedDocs,
    tokenCount: totalTokens,
    truncated,
  };
}

function computeDiversityScore(
  candidate: ContextDocument,
  selected: ContextDocument[]
): number {
  let minSimilarity = 1;
  for (const sel of selected) {
    const sim = calculateSimilarity(candidate, sel);
    minSimilarity = Math.min(minSimilarity, sim);
  }
  return 1 - minSimilarity;
}

function findBestCandidate(
  remaining: ContextDocument[],
  selected: ContextDocument[],
  diversityWeight: number
): { idx: number; score: number } {
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < remaining.length; i += 1) {
    const candidate = remaining[i];
    if (!candidate) {
      continue;
    }

    const diversityScore = computeDiversityScore(candidate, selected);
    const combinedScore =
      candidate.score * (1 - diversityWeight) +
      diversityScore * diversityWeight;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestIdx = i;
    }
  }

  return { idx: bestIdx, score: bestScore };
}

export function selectDiverseDocuments(
  documents: ContextDocument[],
  maxCount: number,
  diversityWeight: number
): ContextDocument[] {
  if (documents.length === 0 || !documents[0]) {
    return [];
  }

  if (documents.length <= maxCount) {
    return documents;
  }

  const selected: ContextDocument[] = [documents[0]];
  const remaining = documents.slice(1);

  while (selected.length < maxCount && remaining.length > 0) {
    const { idx } = findBestCandidate(remaining, selected, diversityWeight);
    const bestDoc = remaining[idx];

    if (!bestDoc) {
      break;
    }

    selected.push(bestDoc);
    remaining.splice(idx, 1);
  }

  return selected;
}

function calculateSimilarity(a: ContextDocument, b: ContextDocument): number {
  if (a.connectorType === b.connectorType) {
    return 0.3;
  }

  const aWords = new Set(a.title.toLowerCase().split(WORD_SPLIT_PATTERN));
  const bWords = new Set(b.title.toLowerCase().split(WORD_SPLIT_PATTERN));

  let intersection = 0;
  for (const word of aWords) {
    if (bWords.has(word)) {
      intersection += 1;
    }
  }

  const union = aWords.size + bWords.size - intersection;
  return union > 0 ? intersection / union : 0;
}
