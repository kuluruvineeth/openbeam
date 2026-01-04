import type {
  ClaimVerification,
  GroundingConfidence,
  GroundingResult,
  RAGChunk,
} from "./types";

const CLAIM_PATTERNS = [
  /([A-Z][^.!?]*(?:is|are|was|were|has|have|had|will|can|should|must)[^.!?]*[.!?])/g,
  /([A-Z][^.!?]*(?:provides?|includes?|contains?|supports?|enables?)[^.!?]*[.!?])/g,
  /([A-Z][^.!?]*(?:created|built|developed|launched|released|announced)[^.!?]*[.!?])/g,
];

const SENTENCE_SPLIT = /[.!?]+/;
const WHITESPACE = /\s+/;
const NON_WORD = /[^\w\s]/g;

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
]);

export function verifyGrounding(
  answer: string,
  chunks: RAGChunk[]
): GroundingResult {
  const claims = extractClaims(answer);

  if (claims.length === 0) {
    return {
      claims: [],
      overallScore: 1.0,
      confidence: "high",
    };
  }

  const verifiedClaims = claims.map((claim) => verifyClaim(claim, chunks));
  const supportedCount = verifiedClaims.filter((c) => c.supported).length;
  const overallScore = supportedCount / verifiedClaims.length;
  const confidence = computeConfidence(overallScore, verifiedClaims);

  return {
    claims: verifiedClaims,
    overallScore,
    confidence,
  };
}

function extractClaims(answer: string): string[] {
  const claims = new Set<string>();

  const sentences = answer
    .split(SENTENCE_SPLIT)
    .filter((s) => s.trim().length > 20);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) {
      continue;
    }

    if (isFactualClaim(trimmed)) {
      claims.add(trimmed);
    }
  }

  for (const pattern of CLAIM_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = answer.matchAll(pattern);
    for (const match of matches) {
      const captured = match[1];
      if (!captured) {
        continue;
      }

      const claim = captured.trim();
      if (claim.length > 20 && claim.length < 500) {
        claims.add(claim);
      }
    }
  }

  return Array.from(claims).slice(0, 10);
}

function isFactualClaim(sentence: string): boolean {
  const lower = sentence.toLowerCase();

  if (
    lower.includes("i think") ||
    lower.includes("i believe") ||
    lower.includes("perhaps") ||
    lower.includes("maybe")
  ) {
    return false;
  }

  if (
    lower.includes("you should") ||
    lower.includes("please") ||
    lower.includes("let me know")
  ) {
    return false;
  }

  if (sentence.endsWith("?")) {
    return false;
  }

  return true;
}

function verifyClaim(claim: string, chunks: RAGChunk[]): ClaimVerification {
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

  let bestMatch: { chunk: RAGChunk; score: number } | null = null;

  for (const chunk of chunks) {
    const chunkTerms = extractSignificantTerms(chunk.content);
    const overlap = computeTermOverlap(claimTerms, chunkTerms);

    if (!bestMatch || overlap > bestMatch.score) {
      bestMatch = { chunk, score: overlap };
    }
  }

  const threshold = 0.3;
  const supported = bestMatch !== null && bestMatch.score >= threshold;

  return {
    claim,
    supported,
    evidenceChunkId: supported && bestMatch ? bestMatch.chunk.id : null,
    evidenceSnippet:
      supported && bestMatch
        ? extractRelevantSnippet(claim, bestMatch.chunk.content)
        : null,
    confidence: bestMatch?.score ?? 0,
  };
}

function extractSignificantTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(NON_WORD, " ")
    .split(WHITESPACE)
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));
}

function computeTermOverlap(
  claimTerms: string[],
  chunkTerms: string[]
): number {
  const chunkTermSet = new Set(chunkTerms);
  let matchCount = 0;

  for (const term of claimTerms) {
    if (chunkTermSet.has(term)) {
      matchCount += 1;
    }
  }

  return claimTerms.length > 0 ? matchCount / claimTerms.length : 0;
}

function extractRelevantSnippet(claim: string, content: string): string {
  const claimTerms = extractSignificantTerms(claim);
  const sentences = content.split(SENTENCE_SPLIT);

  let bestSentence = "";
  let bestScore = 0;

  for (const sentence of sentences) {
    const sentenceTerms = new Set(extractSignificantTerms(sentence));
    let score = 0;

    for (const term of claimTerms) {
      if (sentenceTerms.has(term)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence.trim();
    }
  }

  return bestSentence.slice(0, 200);
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

export function shouldIncludeGrounding(result: GroundingResult): boolean {
  return result.claims.length > 0 && result.confidence !== "high";
}
