export {
  buildDigestConfigModal,
  buildHomeTabBlocks,
  buildHomeTabView,
  buildSettingsModal,
  type DigestConfigSettings,
  getGreeting,
  prepareHomeTabContent,
} from "./builder";

export {
  extractSettingsFromSubmission,
  type HomeSearchParams,
  type HomeTabHandlerDeps,
  handleAppHomeOpened,
  handleClearRecentSearches,
  handleHomeSearch,
  handleOpenSettings,
  handleRemoveSavedItem,
  handleSaveItem,
  handleSaveSettings,
  type OpenSettingsParams,
  type RemoveSavedItemParams,
  refreshHomeTab,
  type SaveItemParams,
  type SaveSettingsParams,
  savedItemExists,
} from "./handler";

export type {
  HomeTabContent,
  HomeTabState,
  QuickAction,
  RecentSearch,
  SavedItem,
} from "./types";

export {
  DEFAULT_QUICK_ACTIONS,
  HOME_CALLBACK_IDS,
  HomeTabStateSchema,
  TIPS,
} from "./types";
