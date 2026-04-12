import { hasResolutionMarker, setResolutionMarker } from "./cache";

const UNRESOLVED_PATTERNS = [
  /that'?s?\s+not\s+(?:what|right|correct)/i,
  /not\s+(?:what|what I)\s+(?:was\s+)?(?:looking|asking)/i,
  /wrong\s+(?:answer|result|thing)/i,
  /try\s+again/i,
  /never\s+mind/i,
];

const TRIGRAM_THRESHOLD = 0.5;

export function computeTrigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const trigrams = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i += 1) {
    trigrams.add(normalized.slice(i, i + 3));
  }
  return trigrams;
}

export function trigramJaccard(a: string, b: string): number {
  const trigramsA = computeTrigrams(a);
  const trigramsB = computeTrigrams(b);

  if (trigramsA.size === 0 || trigramsB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) {
      intersection += 1;
    }
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isRephrase(query: string, previousQuery: string): boolean {
  return trigramJaccard(query, previousQuery) > TRIGRAM_THRESHOLD;
}

export function isExplicitUnresolved(text: string): boolean {
  return UNRESOLVED_PATTERNS.some((p) => p.test(text));
}

export function queryHash(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = Math.trunc((hash * 31 + normalized.charCodeAt(i)) % 2_147_483_647);
  }
  return Math.abs(hash).toString(36);
}

export async function trackQueryResolution(
  teamId: string,
  userId: string,
  queryText: string
): Promise<void> {
  const hash = queryHash(queryText);
  await setResolutionMarker(teamId, userId, hash);
}

export async function checkForRephrase(
  teamId: string,
  userId: string,
  newQuery: string,
  previousQuery: string | null
): Promise<boolean> {
  if (!previousQuery) {
    return false;
  }

  if (isRephrase(newQuery, previousQuery)) {
    return true;
  }

  const hash = queryHash(previousQuery);
  const hasMarker = await hasResolutionMarker(teamId, userId, hash);
  return !hasMarker;
}
