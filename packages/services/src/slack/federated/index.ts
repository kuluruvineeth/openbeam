export {
  buildChannelFilterQuery,
  type ChannelFilterConfig,
  filterChannels,
  filterSearchMatches,
  globToRegex,
  hasRestrictions,
  matchesAnyGlob,
  matchesGlob,
  mergeFilterConfigs,
  parseFilterString,
} from "./filter";

export {
  type FederatedSearchResult,
  type FullFederatedSearchOptions,
  federatedSearch,
  federatedSearchStream,
  quickSearch,
  searchInChannels,
  searchInDateRange,
} from "./search";
