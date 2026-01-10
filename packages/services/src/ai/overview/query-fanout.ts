import type { FanoutQuery } from "./types";

const WORD_SPLIT_PATTERN = /\s+/;
const NON_WORD_PATTERN = /[^\w\s]/g;

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
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
  "can",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "and",
  "but",
  "if",
  "or",
  "because",
  "until",
  "while",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "about",
]);

function extractKeyTerms(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(NON_WORD_PATTERN, " ")
    .split(WORD_SPLIT_PATTERN)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const uniqueTerms = [...new Set(words)];
  return uniqueTerms.slice(0, 6);
}

function generateExpandedQuery(query: string, terms: string[]): string {
  if (terms.length < 2) {
    return query;
  }

  const topTerms = terms.slice(0, 3);
  return `${query} ${topTerms.join(" ")}`;
}

function generateRelatedQuery(query: string, terms: string[]): string {
  if (terms.length < 2) {
    return query;
  }

  const shuffled = [...terms].sort(() => Math.random() - 0.5);
  const selectedTerms = shuffled.slice(0, Math.min(3, shuffled.length));
  return selectedTerms.join(" ");
}

export function generateFanoutQueries(
  query: string,
  count: number
): FanoutQuery[] {
  const queries: FanoutQuery[] = [{ query, intent: "original", weight: 1.0 }];

  if (count <= 1) {
    return queries;
  }

  const terms = extractKeyTerms(query);

  if (count >= 2) {
    queries.push({
      query: generateExpandedQuery(query, terms),
      intent: "expanded",
      weight: 0.7,
    });
  }

  if (count >= 3 && terms.length >= 2) {
    queries.push({
      query: generateRelatedQuery(query, terms),
      intent: "related",
      weight: 0.5,
    });
  }

  return queries.slice(0, count);
}

export function deduplicateResults<T extends { id: string }>(
  results: T[],
  scores: Map<string, number>
): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  const sortedResults = [...results].sort((a, b) => {
    const scoreA = scores.get(a.id) ?? 0;
    const scoreB = scores.get(b.id) ?? 0;
    return scoreB - scoreA;
  });

  for (const item of sortedResults) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      deduped.push(item);
    }
  }

  return deduped;
}

export function mergeScores(
  existing: Map<string, number>,
  newScores: Map<string, number>,
  weight: number
): Map<string, number> {
  const merged = new Map(existing);

  for (const [id, score] of newScores) {
    const existingScore = merged.get(id) ?? 0;
    merged.set(id, Math.max(existingScore, score * weight));
  }

  return merged;
}
