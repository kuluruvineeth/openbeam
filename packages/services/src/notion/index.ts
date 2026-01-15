export * from "./actions";
export {
  type AppendBlockChildrenOptions,
  appendBlockChildren,
  type BlockWithDepth,
  deleteBlock,
  fetchBlockChildren,
  fetchBlockChildrenRecursive,
  type GetBlockChildrenOptions,
  getAllBlockChildren,
  getBlock,
  getBlockChildren,
  updateBlock,
} from "./api/blocks";
export {
  type CreateCommentOptions,
  createBlockComment,
  createComment,
  createPageComment,
  fetchComments,
  type GetCommentsOptions,
  getAllComments,
  getComments,
} from "./api/comments";
export {
  type CreateDatabaseOptions,
  createDatabase,
  type DatabaseQueryFilter,
  type DatabaseQuerySort,
  getDatabase,
  type QueryDatabaseOptions,
  queryDatabase,
  queryDatabaseAll,
  type UpdateDatabaseOptions,
  updateDatabase,
} from "./api/databases";
export {
  archivePage,
  type CreatePageOptions,
  createPage,
  getPage,
  getPageProperty,
  restorePage,
  trashPage,
  type UpdatePageOptions,
  updatePage,
} from "./api/pages";
export {
  type SearchOptions,
  search,
  searchAll,
  searchDatabases,
  searchPages,
} from "./api/search";
export {
  createUserLookup,
  fetchAllUsers,
  getAllUsers,
  getMe,
  getUser,
  type ListUsersOptions,
  listUsers,
} from "./api/users";

export { NotionAuth } from "./auth";

export {
  createNotionClient,
  DEFAULT_RATE_LIMITS,
  DEFAULT_TIMEOUT,
  type NotionClient,
} from "./client";
export {
  handleNotification,
  isExpiredNotification,
  type NotificationResult,
  type NotionNotification,
  parseWebhookPayload,
  verifyWebhookSignature,
} from "./push/notification-handler";
export {
  deleteWatchState,
  getAllActiveWatches,
  getExpiringWatches,
  getWatchState,
  getWatchStateByWebhookId,
  type NotionWatchState,
  setWatchState,
} from "./push/watch-manager";

export { type FullSyncOptions, fullSync } from "./sync/full";

export {
  type IncrementalSyncOptions,
  incrementalSync,
} from "./sync/incremental";

export { transformDatabase, transformDatabases } from "./transformers/database";

export {
  type PageTransformOptions,
  transformPage,
  transformPages,
} from "./transformers/page";

export {
  NOTION_API_BASE,
  NOTION_API_VERSION,
  NotionApiError,
  type NotionApiErrorOptions,
  type NotionErrorCode,
  NotionErrorCodes,
} from "./types";
export {
  type SerializedBlock,
  type SerializedBlockData,
  type SerializedRichText,
  serializeBlocks,
  serializedBlocksToMarkdown,
  serializedRichTextToMarkdown,
} from "./utils/block-serializer";
export {
  blocksToText,
  commentsToText,
  extractAllPropertyValues,
  extractBlockText,
  extractCommentText,
  extractDatabaseDescription,
  extractDatabaseTitle,
  extractPageTitle,
  extractPropertyValue,
  getAuthorId,
  getCoverUrl,
  getCreatedAtMs,
  getIconEmoji,
  getLastEditorId,
  getModifiedAtMs,
  getParentId,
  getParentType,
} from "./utils/content-extractor";
export {
  createTextRichText,
  extractMentionIds,
  extractUrls,
  hasAnnotations,
  richTextToMarkdown,
  richTextToPlainText,
} from "./utils/rich-text";
