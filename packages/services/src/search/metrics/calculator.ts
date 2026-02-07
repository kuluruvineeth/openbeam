export interface SearchMetrics {
  mrr: number;
  ndcg: number;
  precision: number;
  recall: number;
  ctr: number;
  avgDwellTime: number;
}

export interface ImpressionData {
  resultDocIds: string[];
  clicks: Array<{
    docId: string;
    position: number;
    dwellTimeMs: number | null;
  }>;
}

export function calculateMRR(impressions: ImpressionData[]): number {
  if (impressions.length === 0) {
    return 0;
  }

  let rrSum = 0;
  for (const impression of impressions) {
    let firstClickPosition: number | null = null;
    for (const click of impression.clicks) {
      if (firstClickPosition === null || click.position < firstClickPosition) {
        firstClickPosition = click.position;
      }
    }

    if (firstClickPosition !== null) {
      rrSum += 1 / firstClickPosition;
    }
  }

  return rrSum / impressions.length;
}

export function calculateNDCG(impressions: ImpressionData[], k = 10): number {
  if (impressions.length === 0) {
    return 0;
  }

  let ndcgSum = 0;
  for (const impression of impressions) {
    const relevance = new Map<string, number>();
    for (const click of impression.clicks) {
      const score = click.dwellTimeMs
        ? Math.min(click.dwellTimeMs / 30_000, 1) + 1
        : 1;
      relevance.set(
        click.docId,
        Math.max(relevance.get(click.docId) ?? 0, score)
      );
    }

    let dcg = 0;
    let idcg = 0;
    const sortedRelevance = [...relevance.values()].sort((a, b) => b - a);
    const upperBound = Math.min(k, impression.resultDocIds.length);

    for (let i = 0; i < upperBound; i++) {
      const docId = impression.resultDocIds[i];
      const rel = docId ? (relevance.get(docId) ?? 0) : 0;
      dcg += (2 ** rel - 1) / Math.log2(i + 2);

      if (i < sortedRelevance.length) {
        const idealRel = sortedRelevance[i] ?? 0;
        idcg += (2 ** idealRel - 1) / Math.log2(i + 2);
      }
    }

    ndcgSum += idcg > 0 ? dcg / idcg : 0;
  }

  return ndcgSum / impressions.length;
}

export function calculateCTR(impressions: ImpressionData[]): number {
  if (impressions.length === 0) {
    return 0;
  }

  const withClicks = impressions.filter((i) => i.clicks.length > 0).length;
  return withClicks / impressions.length;
}

export function calculateAvgDwellTime(impressions: ImpressionData[]): number {
  const dwellTimes: number[] = [];

  for (const impression of impressions) {
    for (const click of impression.clicks) {
      if (click.dwellTimeMs) {
        dwellTimes.push(click.dwellTimeMs);
      }
    }
  }

  if (dwellTimes.length === 0) {
    return 0;
  }
  return dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
}

export function calculateMetrics(impressions: ImpressionData[]): SearchMetrics {
  return {
    mrr: calculateMRR(impressions),
    ndcg: calculateNDCG(impressions),
    precision: 0,
    recall: 0,
    ctr: calculateCTR(impressions),
    avgDwellTime: calculateAvgDwellTime(impressions),
  };
}
