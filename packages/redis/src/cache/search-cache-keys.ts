export const SEARCH_CACHE_TTL_SECONDS = 1800;

export const SearchCacheKeys = {
  search: (teamId: string, hash: string) => `search:${teamId}:${hash}`,
};
