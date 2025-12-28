import type { RetrievalResult } from "../types";

interface RRFInput {
  bm25: RetrievalResult[];
  dense: RetrievalResult[];
  sparse: RetrievalResult[];
}

interface RRFOutput {
  docId: string;
  score: number;
  bm25Rank: number | null;
  denseRank: number | null;
  sparseRank: number | null;
}

export function reciprocalRankFusion(input: RRFInput, k: number): RRFOutput[] {
  const scores = new Map<
    string,
    {
      score: number;
      bm25Rank: number | null;
      denseRank: number | null;
      sparseRank: number | null;
    }
  >();

  const addScores = (
    results: RetrievalResult[],
    field: "bm25Rank" | "denseRank" | "sparseRank"
  ) => {
    for (const { docId, rank } of results) {
      const existing = scores.get(docId) ?? {
        score: 0,
        bm25Rank: null,
        denseRank: null,
        sparseRank: null,
      };
      existing.score += 1 / (k + rank);
      existing[field] = rank;
      scores.set(docId, existing);
    }
  };

  addScores(input.bm25, "bm25Rank");
  addScores(input.dense, "denseRank");
  addScores(input.sparse, "sparseRank");

  return Array.from(scores.entries())
    .map(([docId, data]) => ({ docId, ...data }))
    .sort((a, b) => b.score - a.score);
}
