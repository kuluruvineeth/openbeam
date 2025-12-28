import type { RetrievalResult, RRFConfig } from "../types";

interface WeightedRRFInput {
  bm25: RetrievalResult[];
  dense: RetrievalResult[];
  sparse: RetrievalResult[];
}

interface WeightedRRFOutput {
  docId: string;
  score: number;
  components: {
    bm25: number;
    dense: number;
    sparse: number;
  };
  ranks: {
    bm25: number | null;
    dense: number | null;
    sparse: number | null;
  };
}

export function weightedReciprocalRankFusion(
  input: WeightedRRFInput,
  config: RRFConfig
): WeightedRRFOutput[] {
  const { k, weights } = config;
  const scores = new Map<string, WeightedRRFOutput>();

  const processResults = (
    results: RetrievalResult[],
    weight: number,
    component: "bm25" | "dense" | "sparse"
  ) => {
    for (const { docId, rank } of results) {
      const rrfContribution = weight * (1 / (k + rank));

      const existing = scores.get(docId) ?? {
        docId,
        score: 0,
        components: { bm25: 0, dense: 0, sparse: 0 },
        ranks: { bm25: null, dense: null, sparse: null },
      };

      existing.score += rrfContribution;
      existing.components[component] = rrfContribution;
      existing.ranks[component] = rank;
      scores.set(docId, existing);
    }
  };

  processResults(input.bm25, weights.bm25, "bm25");
  processResults(input.dense, weights.dense, "dense");
  processResults(input.sparse, weights.sparse, "sparse");

  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}
