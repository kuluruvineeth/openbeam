type RankedResult = {
  documentId: string;
  score: number;
  ftsScore?: number;
  vectorScore?: number;
};

type ScoredResult = {
  documentId: string;
  score: number;
};

function normalizeScores(results: ScoredResult[]): Map<string, number> {
  const map = new Map<string, number>();
  if (results.length === 0) {
    return map;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const r of results) {
    if (r.score < min) {
      min = r.score;
    }
    if (r.score > max) {
      max = r.score;
    }
  }

  const range = max - min;
  for (const r of results) {
    map.set(r.documentId, range === 0 ? 1 : (r.score - min) / range);
  }
  return map;
}

export function hybridRank(
  ftsResults: ScoredResult[],
  vectorResults: ScoredResult[],
  alpha: number
): RankedResult[] {
  const ftsNorm = normalizeScores(ftsResults);
  const vectorNorm = normalizeScores(vectorResults);

  const allIds = new Set<string>();
  for (const r of ftsResults) {
    allIds.add(r.documentId);
  }
  for (const r of vectorResults) {
    allIds.add(r.documentId);
  }

  const ranked: RankedResult[] = [];
  for (const documentId of allIds) {
    const ftsScore = ftsNorm.get(documentId) ?? 0;
    const vectorScore = vectorNorm.get(documentId) ?? 0;
    const score = alpha * vectorScore + (1 - alpha) * ftsScore;
    ranked.push({ documentId, score, ftsScore, vectorScore });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export function rrfRank(resultSets: ScoredResult[][], k = 60): ScoredResult[] {
  const scores = new Map<string, number>();

  for (const results of resultSets) {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    for (let rank = 0; rank < sorted.length; rank += 1) {
      const { documentId } = sorted[rank];
      const current = scores.get(documentId) ?? 0;
      scores.set(documentId, current + 1 / (k + rank + 1));
    }
  }

  const ranked: ScoredResult[] = [];
  for (const [documentId, score] of scores) {
    ranked.push({ documentId, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
