const HALF_LIFE_DAYS = 7;

export function hotnessScore(activeCount: number, updatedAt: Date): number {
  const ageDays = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const frequency = 1 / (1 + Math.exp(-Math.log1p(activeCount)));
  const recency = 2 ** (-ageDays / HALF_LIFE_DAYS);
  return frequency * recency;
}

export function finalScore(
  semanticScore: number,
  hotness: number,
  hotnessWeight = 0.2
): number {
  return (1 - hotnessWeight) * semanticScore + hotnessWeight * hotness;
}

export function propagateScore(
  childScore: number,
  parentScore: number,
  childWeight = 0.5
): number {
  return childWeight * childScore + (1 - childWeight) * parentScore;
}
