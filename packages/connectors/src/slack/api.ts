/**
 * Slack API Constants
 * Shared between all layers (web, server, worker)
 */

/**
 * Slack API base URL
 */
export const SLACK_API_BASE = "https://slack.com/api";

/**
 * Slack API rate limits (requests per minute)
 * https://api.slack.com/docs/rate-limits
 */
export const SLACK_RATE_LIMITS = {
  // Tier 1: ~1 request per second
  tier1: 60,
  // Tier 2: ~20 requests per minute
  tier2: 20,
  // Tier 3: ~50 requests per minute
  tier3: 50,
  // Tier 4: ~100+ requests per minute
  tier4: 100,
} as const;

/**
 * Map of Slack methods to their rate limit tiers
 */
export const SLACK_METHOD_TIERS: Record<
  string,
  keyof typeof SLACK_RATE_LIMITS
> = {
  // Tier 1 - Most common
  "conversations.list": "tier2",
  "conversations.history": "tier3",
  "conversations.replies": "tier3",
  "conversations.members": "tier3",
  "users.list": "tier2",
  "users.info": "tier3",
  "files.list": "tier3",
  "team.info": "tier3",
  // Posting methods
  "chat.postMessage": "tier1",
  "chat.update": "tier3",
  "reactions.add": "tier2",
};

/**
 * Slack message subtypes that should be indexed
 */
export const INDEXABLE_SUBTYPES = [
  undefined, // Regular messages
  "file_share",
  "thread_broadcast",
] as const;

/**
 * Slack message subtypes to skip
 */
export const SKIP_SUBTYPES = [
  "channel_join",
  "channel_leave",
  "channel_topic",
  "channel_purpose",
  "channel_name",
  "bot_add",
  "bot_remove",
  "pinned_item",
  "unpinned_item",
] as const;

/**
 * Default batch sizes for Slack API calls
 */
export const SLACK_BATCH_SIZES = {
  channels: 200,
  messages: 100,
  users: 200,
  files: 100,
} as const;

/**
 * Slack webhook event types we handle
 */
export const SLACK_EVENT_TYPES = {
  // Message events
  message: "message",
  messageChanged: "message.changed",
  messageDeleted: "message.deleted",
  // Channel events
  channelCreated: "channel_created",
  channelDeleted: "channel_deleted",
  channelRenamed: "channel_rename",
  channelArchived: "channel_archive",
  channelUnarchived: "channel_unarchive",
  // Member events
  memberJoined: "member_joined_channel",
  memberLeft: "member_left_channel",
  // File events
  fileShared: "file_shared",
  fileDeleted: "file_deleted",
  // User events
  userChange: "user_change",
  teamJoin: "team_join",
} as const;
