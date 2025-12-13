export type { GetMembersOptions, ListChannelsOptions } from "./api/channels";
export {
  buildChannelMemberMap,
  filterChannelsByType,
  getAccessibleChannels,
  getAllChannelMembers,
  getAllChannels,
  getChannelInfo,
  getChannelMembers,
  isBotMember,
  listChannels,
} from "./api/channels";

export type {
  GetFileInfoResponse,
  ListFilesOptions,
  ListFilesResponse,
} from "./api/files";
export {
  filterSupportedFiles,
  getAllFiles,
  getDownloadUrl,
  getFileInfo,
  getFilesSince,
  hasDownloadUrl,
  listFiles,
} from "./api/files";

export type {
  FetchMessagesOptions,
  FetchRepliesOptions,
  FetchThreadRepliesSinceOptions,
  MessageWithReplies,
} from "./api/messages";
export {
  fetchMessages,
  fetchMessagesSince,
  fetchMessagesWithReplies,
  fetchThreadReplies,
  fetchThreadRepliesSince,
  getAllMessages,
  getAllThreadReplies,
  getLatestTimestamp,
  hasReplies,
  isThreadParent,
  isThreadReply,
  msToSlackTs,
  slackTsToMs,
  sortMessagesByTimestamp,
} from "./api/messages";

export type {
  SearchMessagesOptions,
  SearchQueryFilters,
  SlackSearchResult,
} from "./api/search";
export {
  buildSearchQuery,
  extractChannelIds,
  extractUserIds,
  groupMatchesByChannel,
  searchMessages,
  searchMessagesAll,
  sortMatchesByTimestamp,
} from "./api/search";

export type { ListUsersOptions, UserLookup } from "./api/users";
export {
  createUserLookup,
  filterAdmins,
  filterOutBots,
  filterOutDeleted,
  getActiveUsers,
  getAllUsers,
  getTeamInfo,
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInfo,
  getUsersInfo,
  listUsers,
} from "./api/users";

export { SlackAuth } from "./auth";

export type { SlackClient } from "./client";
export {
  createSlackClient,
  DEFAULT_RATE_LIMITS,
  DEFAULT_TIMEOUT,
} from "./client";

export type {
  DocumentChange,
  DocumentOperation,
  EventHandlerContext,
  EventHandlerResult,
} from "./events/handlers";
export { handleSlackEvent, handleSlackEventBatch } from "./events/handlers";

export type {
  ParsedEventResult,
  SlackEventRequest,
  VerifyResult,
} from "./events/parser";
export {
  getEventChannelId,
  getEventUserId,
  isChannelEvent,
  isMemberEvent,
  isMessageChangedEvent,
  isMessageDeletedEvent,
  isMessageEvent,
  isReactionEvent,
  parseSlackEvent,
  verifySlackSignature,
} from "./events/parser";

export type {
  AppMentionEvent,
  BaseEvent,
  ChannelArchiveEvent,
  ChannelCreatedEvent,
  ChannelDeletedEvent,
  ChannelRenameEvent,
  ChannelUnarchiveEvent,
  FileDeletedEvent,
  FileSharedEvent,
  MemberJoinedChannelEvent,
  MemberLeftChannelEvent,
  MessageChangedEvent,
  MessageDeletedEvent,
  MessageEvent,
  ReactionAddedEvent,
  ReactionRemovedEvent,
  SlackEvent,
  SlackEventEnvelope,
  SlackEventType,
  UserChangeEvent,
} from "./events/types";
export {
  MessageChangedEventSchema,
  MessageDeletedEventSchema,
  MessageEventSchema,
  SlackEventEnvelopeSchema,
} from "./events/types";

export type { ChannelFilterConfig } from "./federated/filter";
export {
  buildChannelFilterQuery,
  filterChannels,
  filterSearchMatches,
  globToRegex,
  hasRestrictions,
  matchesAnyGlob,
  matchesGlob,
  mergeFilterConfigs,
  parseFilterString,
} from "./federated/filter";

export type {
  FederatedSearchResult,
  FullFederatedSearchOptions,
} from "./federated/search";
export {
  federatedSearch,
  federatedSearchStream,
  quickSearch,
  searchInChannels,
  searchInDateRange,
} from "./federated/search";

export type { ChannelSyncResult, SyncChannelsOptions } from "./sync/channels";
export {
  getChangedChannels,
  syncChannels,
  syncChannelsBatched,
} from "./sync/channels";

export type {
  FileSyncBatch,
  FileSyncOptions,
  SlackFileInfo,
} from "./sync/files";
export {
  getLatestFileTimestamp,
  syncFiles,
  transformSlackFile,
} from "./sync/files";

export type {
  FullSyncResult,
  IncrementalSyncOptions,
  SyncProgressCallback,
  SyncStatsAccumulator,
} from "./sync/incremental";
export {
  createInitialCursor,
  createStatsAccumulator,
  deltaSync,
  finalizeStats,
  fullSync,
  getLatestCursorTimestamp,
  incrementalSync,
  mergeCursors,
  needsFullSync,
  updateStats,
} from "./sync/incremental";

export type { MessageSyncResult, SyncMessagesOptions } from "./sync/messages";
export {
  syncChannelMessages,
  syncChannelMessagesBatched,
  syncMultipleChannels,
} from "./sync/messages";

export type { ChannelTransformContext } from "./transformers/channel";
export {
  getChannelDisplayName,
  getChannelType,
  isAccessible,
  shouldIndex,
  transformChannel,
  transformChannels,
} from "./transformers/channel";

export type {
  MessageTransformContext,
  MessageTransformOptions,
} from "./transformers/message";
export {
  cleanMessageText,
  extractChannelRefs,
  extractMentions,
  extractUrls,
  transformMessage,
  transformMessages,
} from "./transformers/message";

export {
  getEmailDomain,
  getUserIdentityKey,
  isActive,
  isAdmin,
  isHuman,
  transformUser,
  transformUsers,
} from "./transformers/user";

export type {
  FederatedSearchOptions,
  RateLimitState,
  SlackBlock,
  SlackChannel,
  SlackClientConfig,
  SlackFile,
  SlackMessage,
  SlackProfile,
  SlackReaction,
  SlackSearchMatch,
  SlackTeam,
  SlackUser,
  SyncBatch,
  SyncCursor,
  SyncOptions,
  TransformContext,
} from "./types";
export {
  SlackApiError,
  SlackChannelSchema,
  SlackErrorCodes,
  SlackFileSchema,
  SlackMessageSchema,
  SlackUserSchema,
} from "./types";
