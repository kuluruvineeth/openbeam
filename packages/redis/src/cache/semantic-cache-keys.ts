export const ONE_HOUR_SECONDS = 3600;
export const SIMILARITY_THRESHOLD = 0.75;
export const MAX_ENTRIES_PER_TEAM = 1000;

export const SemanticCacheKeys = {
  index: (teamId: string) => `sem:idx:${teamId}`,
  entry: (teamId: string, entryId: string) => `sem:entry:${teamId}:${entryId}`,
};
