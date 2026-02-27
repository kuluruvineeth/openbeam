export { shouldClearAgentAttentionOnView } from "./agent-attention";
export {
  type DateGroup,
  deriveDateGroup,
  deriveProjectKey,
  deriveProjectName,
  deriveRemoteProjectKey,
  type GroupedAgents,
  groupAgents,
  type ProjectGroup,
  parseRepoNameFromRemoteUrl,
  parseRepoShortNameFromRemoteUrl,
} from "./agent-grouping";
export {
  attachInitTimeout,
  createInitDeferred,
  type DeferredInit,
  getInitDeferred,
  getInitKey,
  rejectInitDeferred,
  resolveInitDeferred,
} from "./agent-initialization";
export {
  getAgentStatusColor,
  getAgentStatusLabel,
} from "./agent-status";
export {
  type AutocompleteOptionsPosition,
  getAutocompleteFallbackIndex,
  getAutocompleteNextIndex,
  getAutocompleteScrollOffset,
  orderAutocompleteOptions,
} from "./autocomplete-utils";
export {
  type BinaryFrameHandler,
  createBinaryDemuxer,
  type TerminalOutputHandler,
} from "./binary-mux";
export { getOrCreateClientSessionKey } from "./client-session-key";
export {
  clearCommandCenterFocusRestoreElement,
  focusWithRetries,
  setCommandCenterFocusRestoreElement,
  takeCommandCenterFocusRestoreElement,
} from "./command-center-focus";
export { selectBestConnection } from "./connection-selection";
export {
  type ConnectionStatus,
  formatConnectionStatus,
  getConnectionStatusTone,
  type StatusTone,
} from "./connection-status";
export {
  buildDefaultEndpoint,
  createDaemonClient,
  type DaemonClient,
  type DaemonClientOptions,
} from "./daemon-client";
export { formatShortcut } from "./format-shortcut";
export {
  buildDaemonAgentDetailRoute,
  buildDaemonAgentDraftRoute,
  buildDaemonAgentsRoute,
  buildDaemonSettingsRoute,
  daemonNavigate,
  mapPathnameToServer,
  parseHostAgentDraftRouteFromPathname,
  parseHostAgentRouteFromPathname,
  parseServerIdFromPathname,
} from "./host-routes";
export {
  type DecodedMessage,
  decodeInbound,
  encodeBinaryFrame,
  encodeOutbound,
} from "./message-codec";
export {
  deriveProjectPlacementFromCwd,
  resolveProjectPlacement,
} from "./project-placement";
export { shortenPath } from "./shorten-path";
export {
  deriveSidebarStateBucket,
  isSidebarActiveAgent,
  type SidebarAttentionReason,
  type SidebarStateBucket,
} from "./sidebar-agent-state";
export {
  applyStreamEvent,
  generateMessageId,
  hydrateStreamState,
  reduceStreamUpdate,
} from "./stream-reducer";
export {
  buildLineDiff,
  extractTaskEntriesFromToolCall,
  parseUnifiedDiff,
} from "./tool-call-parsers";
