export interface SearchQualityMetrics {
  querySuccessRate: number;
  firstAttemptSuccessRate: number;
  zeroResultsRate: number;
  meanReciprocalRank: number;
  mrrAt5: number;
  mrrAt10: number;
  clickThroughRate: number;
  averageClicks: number;
  averageTimeToClick: number;
  averageDwellTime: number;
  refinementRate: number;
  filterUsageRate: number;
  averageSatisfactionScore: number;
  npsScore: number;
}

export interface AIAnswerQualityMetrics {
  accuracyRate: number;
  citationClickRate: number;
  citationRelevanceScore: number;
  averageConversationLength: number;
  followUpRate: number;
  actionCompletionRate: number;
  actionTypes: Record<string, number>;
  averageLatency: number;
  timeToFirstToken: number;
}

export interface QueryResult {
  queryId: string;
  firstClickPosition: number | null;
  clickCount: number;
  wasRefined: boolean;
  hadResults: boolean;
  satisfactionScore?: number;
  timeToClickMs?: number;
  dwellTimeMs?: number;
  usedFilters: boolean;
}

export function calculateMRR(queries: QueryResult[]): number {
  if (queries.length === 0) {
    return 0;
  }

  const reciprocalRanks = queries.map((q) => {
    if (q.firstClickPosition === null || q.firstClickPosition <= 0) {
      return 0;
    }
    return 1 / q.firstClickPosition;
  });

  return reciprocalRanks.reduce((a, b) => a + b, 0) / queries.length;
}

export function calculateMRRAtK(queries: QueryResult[], k: number): number {
  if (queries.length === 0) {
    return 0;
  }

  const reciprocalRanks = queries.map((q) => {
    if (q.firstClickPosition === null || q.firstClickPosition <= 0) {
      return 0;
    }
    if (q.firstClickPosition > k) {
      return 0;
    }
    return 1 / q.firstClickPosition;
  });

  return reciprocalRanks.reduce((a, b) => a + b, 0) / queries.length;
}

export function calculateQuerySuccessRate(queries: QueryResult[]): number {
  if (queries.length === 0) {
    return 0;
  }
  const successfulQueries = queries.filter((q) => q.clickCount > 0);
  return successfulQueries.length / queries.length;
}

export function calculateZeroResultsRate(queries: QueryResult[]): number {
  if (queries.length === 0) {
    return 0;
  }
  const zeroResultQueries = queries.filter((q) => !q.hadResults);
  return zeroResultQueries.length / queries.length;
}

export function calculateFirstAttemptSuccessRate(
  queries: QueryResult[]
): number {
  if (queries.length === 0) {
    return 0;
  }
  const firstAttemptSuccess = queries.filter(
    (q) => q.clickCount > 0 && !q.wasRefined
  );
  return firstAttemptSuccess.length / queries.length;
}

export function calculateRefinementRate(queries: QueryResult[]): number {
  if (queries.length === 0) {
    return 0;
  }
  const refinedQueries = queries.filter((q) => q.wasRefined);
  return refinedQueries.length / queries.length;
}

export function calculateFilterUsageRate(queries: QueryResult[]): number {
  if (queries.length === 0) {
    return 0;
  }
  const filteredQueries = queries.filter((q) => q.usedFilters);
  return filteredQueries.length / queries.length;
}

export function calculateAverageTimeToClick(queries: QueryResult[]): number {
  const queriesWithClicks = queries.filter(
    (q) => q.timeToClickMs !== undefined
  );
  if (queriesWithClicks.length === 0) {
    return 0;
  }

  const totalTime = queriesWithClicks.reduce(
    (sum, q) => sum + (q.timeToClickMs ?? 0),
    0
  );
  return totalTime / queriesWithClicks.length;
}

export function calculateAverageDwellTime(queries: QueryResult[]): number {
  const queriesWithDwell = queries.filter((q) => q.dwellTimeMs !== undefined);
  if (queriesWithDwell.length === 0) {
    return 0;
  }

  const totalTime = queriesWithDwell.reduce(
    (sum, q) => sum + (q.dwellTimeMs ?? 0),
    0
  );
  return totalTime / queriesWithDwell.length;
}

export function calculateAverageSatisfactionScore(
  queries: QueryResult[]
): number {
  const queriesWithSatisfaction = queries.filter(
    (q) => q.satisfactionScore !== undefined
  );
  if (queriesWithSatisfaction.length === 0) {
    return 0;
  }

  const totalScore = queriesWithSatisfaction.reduce(
    (sum, q) => sum + (q.satisfactionScore ?? 0),
    0
  );
  return totalScore / queriesWithSatisfaction.length;
}

export function calculateClickThroughRate(
  totalClicks: number,
  totalImpressions: number
): number {
  if (totalImpressions === 0) {
    return 0;
  }
  return totalClicks / totalImpressions;
}

export function calculateAllMetrics(
  queries: QueryResult[]
): SearchQualityMetrics {
  const totalClicks = queries.reduce((sum, q) => sum + q.clickCount, 0);
  const totalImpressions = queries.filter((q) => q.hadResults).length;

  return {
    querySuccessRate: calculateQuerySuccessRate(queries),
    firstAttemptSuccessRate: calculateFirstAttemptSuccessRate(queries),
    zeroResultsRate: calculateZeroResultsRate(queries),
    meanReciprocalRank: calculateMRR(queries),
    mrrAt5: calculateMRRAtK(queries, 5),
    mrrAt10: calculateMRRAtK(queries, 10),
    clickThroughRate: calculateClickThroughRate(totalClicks, totalImpressions),
    averageClicks: queries.length > 0 ? totalClicks / queries.length : 0,
    averageTimeToClick: calculateAverageTimeToClick(queries),
    averageDwellTime: calculateAverageDwellTime(queries),
    refinementRate: calculateRefinementRate(queries),
    filterUsageRate: calculateFilterUsageRate(queries),
    averageSatisfactionScore: calculateAverageSatisfactionScore(queries),
    npsScore: 0,
  };
}

export function calculateDCG(relevanceScores: number[]): number {
  return relevanceScores.reduce(
    (sum, rel, i) => sum + (2 ** rel - 1) / Math.log2(i + 2),
    0
  );
}

export function calculateNDCG(
  relevanceScores: number[],
  idealScores?: number[]
): number {
  if (relevanceScores.length === 0) {
    return 0;
  }

  const dcg = calculateDCG(relevanceScores);

  const ideal = idealScores ?? [...relevanceScores].sort((a, b) => b - a);
  const idcg = calculateDCG(ideal);

  if (idcg === 0) {
    return 0;
  }

  return dcg / idcg;
}

export function calculateNDCGAtK(
  relevanceScores: number[],
  k: number,
  idealScores?: number[]
): number {
  const topK = relevanceScores.slice(0, k);
  const idealTopK = idealScores?.slice(0, k);
  return calculateNDCG(topK, idealTopK);
}

export function calculatePrecisionAtK(
  relevantPositions: number[],
  k: number
): number {
  const relevantInTopK = relevantPositions.filter((pos) => pos <= k).length;
  return relevantInTopK / k;
}

export function calculateRecallAtK(
  relevantPositions: number[],
  k: number,
  totalRelevant: number
): number {
  if (totalRelevant === 0) {
    return 0;
  }
  const relevantInTopK = relevantPositions.filter((pos) => pos <= k).length;
  return relevantInTopK / totalRelevant;
}

export const GLEAN_BENCHMARKS = {
  querySuccessRate: {
    target: 0.75,
    description: "75% of queries should have clicks",
  },
  zeroResultsRate: {
    target: 0.05,
    description: "Less than 5% zero result queries",
  },
  meanReciprocalRank: {
    target: 0.6,
    description: "First result clicked 60% of time",
  },
  responseTime: { target: 1.5, description: "Response under 1.5 seconds" },
  aiAccuracy: { target: 0.85, description: "85% positive AI feedback" },
  stickiness: { target: 0.4, description: "40% DAU/MAU for B2B" },
} as const;
