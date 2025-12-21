export {
  downloadAttachment,
  extractAllAttachments,
  extractAllMedia,
  extractAttachments,
  extractMedia,
  getAttachment,
  getTotalAttachmentSize,
  hasAttachments,
} from "./attachments";
export {
  dedupeHistoryChanges,
  fetchHistory,
  getAddedMessageIds,
  getAffectedThreadIds,
  getDeletedMessageIds,
  groupChangesByThread,
  type HistoryChange,
  type HistoryOptions,
  parseHistoryChanges,
} from "./history";

export {
  buildLabelQuery,
  createLabelLookup,
  getLabel,
  getLabelsByIds,
  getLabelsByNames,
  getSystemLabels,
  getUserLabels,
  isSystemLabel,
  type LabelLookup,
  listLabels,
} from "./labels";
export {
  batchGetMessages,
  type FetchMessageOptions,
  type FetchMessagesOptions,
  fetchMessageIds,
  fetchMessagesWithContent,
  getMessage,
  searchMessages,
} from "./messages";
export {
  batchGetThreads,
  type FetchThreadOptions,
  type FetchThreadsOptions,
  fetchThreadIds,
  fetchThreadsWithMessages,
  getThread,
  getThreadParticipants,
  type ThreadListItem,
} from "./threads";

export {
  createWatchState,
  type GmailPushNotification,
  getWatchRenewalTime,
  isWatchExpiringSoon,
  type PubSubNotification,
  parsePubSubNotification,
  parseWatchExpiration,
  setupWatch,
  stopWatch,
  WATCH_EXPIRATION_DAYS,
  WATCH_RENEWAL_BUFFER_HOURS,
  type WatchRequest,
  type WatchState,
} from "./watch";
