import type {
  ClaimVerification,
  GroundingConfidence,
  GroundingResult,
  RAGChunk,
} from "./types";

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;
const WHITESPACE = /\s+/;
const NON_WORD = /[^\w\s]/g;

const FACTUAL_PATTERNS = [
  /\b(?:is|are|was|were|has|have|had|will|can|should|must)\b/,
  /\b(?:provides?|includes?|contains?|supports?|enables?)\b/,
  /\b(?:created|built|developed|launched|released|announced)\b/,
  /\b(?:consists?|requires?|allows?|uses?|works?)\b/,
  /\b(?:shows?|demonstrates?|indicates?|reveals?)\b/,
];

const OPINION_MARKERS = [
  "i think",
  "i believe",
  "in my opinion",
  "perhaps",
  "maybe",
  "probably",
  "seems like",
  "appears to",
  "i feel",
  "i suppose",
];

const INSTRUCTION_MARKERS = [
  "you should",
  "you can",
  "you might",
  "please",
  "try to",
  "consider",
  "make sure",
  "don't forget",
  "remember to",
  "let me know",
];

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "they",
  "them",
  "their",
  "its",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "yet",
  "so",
  "in",
  "on",
  "at",
  "to",
  "from",
  "with",
  "by",
  "of",
  "as",
  "if",
  "then",
  "than",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "what",
  "how",
  "why",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "also",
  "just",
  "about",
]);

export function verifyGrounding(
  answer: string,
  chunks: RAGChunk[],
  threshold = 0.3
): GroundingResult {
  const claims = extractClaims(answer);

  if (claims.length === 0) {
    return {
      claims: [],
      overallScore: 1.0,
      confidence: "high",
      unsupportedClaims: [],
    };
  }

  const chunkIndex = buildChunkIndex(chunks);
  const verifiedClaims = claims.map((claim) =>
    verifyClaim(claim, chunks, chunkIndex, threshold)
  );

  const supportedCount = verifiedClaims.filter((c) => c.supported).length;
  const overallScore = supportedCount / verifiedClaims.length;
  const confidence = computeConfidence(overallScore, verifiedClaims);
  const unsupportedClaims = verifiedClaims
    .filter((c) => !c.supported)
    .map((c) => c.claim);

  return {
    claims: verifiedClaims,
    overallScore,
    confidence,
    unsupportedClaims,
  };
}

function extractClaims(answer: string): string[] {
  const claims: string[] = [];
  const seen = new Set<string>();

  const sentences = answer
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.length < 500);

  for (const sentence of sentences) {
    if (seen.has(sentence.toLowerCase())) {
      continue;
    }

    if (isFactualClaim(sentence)) {
      seen.add(sentence.toLowerCase());
      claims.push(sentence);
    }
  }

  return claims.slice(0, 15);
}

function isFactualClaim(sentence: string): boolean {
  const lower = sentence.toLowerCase();

  for (const marker of OPINION_MARKERS) {
    if (lower.includes(marker)) {
      return false;
    }
  }

  for (const marker of INSTRUCTION_MARKERS) {
    if (lower.includes(marker)) {
      return false;
    }
  }

  if (sentence.endsWith("?")) {
    return false;
  }

  for (const pattern of FACTUAL_PATTERNS) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return sentence.length > 30;
}

interface ChunkIndex {
  termToChunks: Map<string, Set<number>>;
  chunkTerms: Map<number, Set<string>>;
  bigramToChunks: Map<string, Set<number>>;
}

function buildChunkIndex(chunks: RAGChunk[]): ChunkIndex {
  const termToChunks = new Map<string, Set<number>>();
  const chunkTerms = new Map<number, Set<string>>();
  const bigramToChunks = new Map<string, Set<number>>();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) {
      continue;
    }

    const terms = extractSignificantTerms(chunk.content);
    chunkTerms.set(i, new Set(terms));

    for (const term of terms) {
      if (!termToChunks.has(term)) {
        termToChunks.set(term, new Set());
      }
      termToChunks.get(term)?.add(i);
    }

    for (let j = 0; j < terms.length - 1; j++) {
      const bigram = `${terms[j]}_${terms[j + 1]}`;
      if (!bigramToChunks.has(bigram)) {
        bigramToChunks.set(bigram, new Set());
      }
      bigramToChunks.get(bigram)?.add(i);
    }
  }

  return { termToChunks, chunkTerms, bigramToChunks };
}

function verifyClaim(
  claim: string,
  chunks: RAGChunk[],
  index: ChunkIndex,
  threshold: number
): ClaimVerification {
  const claimTerms = extractSignificantTerms(claim);

  if (claimTerms.length === 0) {
    return {
      claim,
      supported: true,
      evidenceChunkId: null,
      evidenceSnippet: null,
      confidence: 0.5,
    };
  }

  const candidateChunks = findCandidateChunks(claimTerms, index, chunks.length);

  let bestMatch: { chunkIndex: number; score: number } | null = null;

  for (const chunkIdx of candidateChunks) {
    const chunkTermSet = index.chunkTerms.get(chunkIdx);
    if (!chunkTermSet) {
      continue;
    }

    const score = computeOverlapScore(claimTerms, chunkTermSet);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { chunkIndex: chunkIdx, score };
    }
  }

  const supported = bestMatch !== null && bestMatch.score >= threshold;
  const matchedChunk = bestMatch ? chunks[bestMatch.chunkIndex] : null;

  return {
    claim,
    supported,
    evidenceChunkId: supported && matchedChunk ? matchedChunk.id : null,
    evidenceSnippet:
      supported && matchedChunk
        ? extractRelevantSnippet(claim, matchedChunk.content)
        : null,
    confidence: bestMatch?.score ?? 0,
  };
}

function scoreTermMatches(
  claimTerms: string[],
  index: ChunkIndex
): Map<number, number> {
  const candidates = new Map<number, number>();

  for (const term of claimTerms) {
    const chunks = index.termToChunks.get(term);
    if (!chunks) {
      continue;
    }
    for (const chunkIdx of chunks) {
      candidates.set(chunkIdx, (candidates.get(chunkIdx) ?? 0) + 1);
    }
  }

  return candidates;
}

function scoreBigramMatches(
  claimTerms: string[],
  index: ChunkIndex,
  candidates: Map<number, number>
): void {
  for (let i = 0; i < claimTerms.length - 1; i += 1) {
    const bigram = `${claimTerms[i]}_${claimTerms[i + 1]}`;
    const chunks = index.bigramToChunks.get(bigram);
    if (!chunks) {
      continue;
    }
    for (const chunkIdx of chunks) {
      candidates.set(chunkIdx, (candidates.get(chunkIdx) ?? 0) + 2);
    }
  }
}

function findCandidateChunks(
  claimTerms: string[],
  index: ChunkIndex,
  totalChunks: number
): Set<number> {
  const candidates = scoreTermMatches(claimTerms, index);
  scoreBigramMatches(claimTerms, index, candidates);

  const sorted = [...candidates.entries()].sort((a, b) => b[1] - a[1]);
  const limit = Math.min(10, totalChunks, sorted.length);

  return new Set(sorted.slice(0, limit).map((entry) => entry[0]));
}

function extractSignificantTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(NON_WORD, " ")
    .split(WHITESPACE)
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));
}

function computeOverlapScore(
  claimTerms: string[],
  chunkTerms: Set<string>
): number {
  if (claimTerms.length === 0) {
    return 0;
  }

  let matchCount = 0;
  for (const term of claimTerms) {
    if (chunkTerms.has(term)) {
      matchCount += 1;
    }
  }

  return matchCount / claimTerms.length;
}

function extractRelevantSnippet(claim: string, content: string): string {
  const claimTerms = new Set(extractSignificantTerms(claim));
  const sentences = content.split(SENTENCE_SPLIT);

  let bestSentence = "";
  let bestScore = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) {
      continue;
    }

    const sentenceTerms = extractSignificantTerms(trimmed);
    let score = 0;

    for (const term of sentenceTerms) {
      if (claimTerms.has(term)) {
        score += 1;
      }
    }

    if (
      score > bestScore ||
      (score === bestScore && trimmed.length < bestSentence.length)
    ) {
      bestScore = score;
      bestSentence = trimmed;
    }
  }

  if (bestSentence.length > 250) {
    return `${bestSentence.slice(0, 247)}...`;
  }

  return bestSentence;
}

function computeConfidence(
  overallScore: number,
  claims: ClaimVerification[]
): GroundingConfidence {
  if (claims.length === 0) {
    return "high";
  }

  const avgClaimConfidence =
    claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;

  if (overallScore >= 0.8 && avgClaimConfidence >= 0.6) {
    return "high";
  }
  if (overallScore >= 0.5 && avgClaimConfidence >= 0.4) {
    return "medium";
  }
  if (overallScore >= 0.3) {
    return "low";
  }
  return "uncertain";
}

export function shouldWarnAboutGrounding(result: GroundingResult): boolean {
  return (
    result.unsupportedClaims.length > 0 ||
    result.confidence === "low" ||
    result.confidence === "uncertain"
  );
}

export function formatGroundingWarning(result: GroundingResult): string | null {
  if (!shouldWarnAboutGrounding(result)) {
    return null;
  }

  const parts: string[] = [];

  if (result.confidence === "uncertain") {
    parts.push(
      "The response could not be fully verified against the available sources."
    );
  } else if (result.confidence === "low") {
    parts.push(
      "Some parts of this response have limited support from the sources."
    );
  }

  if (result.unsupportedClaims.length > 0) {
    parts.push(
      `${result.unsupportedClaims.length} statement(s) could not be verified.`
    );
  }

  return parts.join(" ");
}

export function getEvidenceForAnswer(
  result: GroundingResult,
  chunks: RAGChunk[]
): Map<string, RAGChunk> {
  const evidenceMap = new Map<string, RAGChunk>();
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  for (const claim of result.claims) {
    if (claim.supported && claim.evidenceChunkId) {
      const chunk = chunkById.get(claim.evidenceChunkId);
      if (chunk) {
        evidenceMap.set(claim.claim, chunk);
      }
    }
  }

  return evidenceMap;
}
