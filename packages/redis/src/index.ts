// === Client & Connection ===

// === Legacy Cache (Single Class) ===
export { Cache, cache } from "./cache";
export {
  type CachedContext,
  ContextCache,
  type ConversationContext,
  contextCache,
} from "./cache/context-cache";
export {
  type CachedConnector,
  type CachedTeam,
  type CachedUser,
  EntityCache,
  entityCache,
} from "./cache/entity-cache";
// === Enterprise Cache Layer ===
export * from "./cache/index";
export {
  type EffectivePermissions,
  PermissionCache,
  permissionCache,
  type ResourceType,
} from "./cache/permission-cache";
export {
  type CachedSearchResult,
  SearchCache,
  type SearchResultItem,
  type SearchSuggestion,
  searchCache,
} from "./cache/search-cache";
export {
  type PresenceData,
  SessionCache,
  type SessionData,
  sessionCache,
} from "./cache/session-cache";
// === Circuit Breaker ===
export {
  CircuitBreaker,
  type CircuitBreakerConfig,
  CircuitOpenError,
  type CircuitState,
  type CircuitStats,
  circuitBreakerRegistry,
  embeddingCircuit,
  getConnectorCircuit,
  llmCircuit,
  vespaCircuit,
} from "./circuit-breaker";
export {
  closeRedisClient,
  closeSharedBullMqConnection,
  getRedisClient,
  getRedisConnection,
  getSharedBullMqConnection,
  redisClient,
  sharedBullMqConnection,
} from "./client";
// === Event Deduplication ===
export { EventDeduplicator, eventDeduplicator } from "./deduplication";
// === Job Scheduling ===
export { jobSchedulerKeys } from "./job-scheduler-keys";
// === Distributed Locking ===
export { DistributedLock, distributedLock } from "./locks";
export { Fence, fence } from "./locks/fence";
// === Pub/Sub ===
export {
  broadcastConnectorStatus,
  broadcastSyncComplete,
  type ChannelType,
  type ConversationEvent,
  type DocumentEvent,
  notifyUser,
  type PresenceEvent,
  PubSubManager,
  type PubSubMessage,
  pubsub,
  sendTypingIndicator,
  type TeamEvent,
  type UserEvent,
} from "./pubsub";

// === Queues ===
export * from "./queues";
export { closeAllQueues } from "./queues";
// Actions & Workflows
export type {
  ActionCategory,
  ActionJobData,
  ActionJobResult,
  ActionTriggerType,
} from "./queues/action-queue";
// AI & Agent
export type {
  AgentConfig,
  AgentContext,
  AgentJobData,
  AgentJobResult,
  AgentStep,
  AgentStepType,
  AgentTaskType,
} from "./queues/agent-queue";
// Analytics
export type {
  AnalyticsJobData,
  InteractionType,
  TrackInteractionData,
  TrackSearchData,
} from "./queues/analytics-queue";
export {
  trackInteraction,
  trackInteractionsBatch,
  trackSearch,
} from "./queues/analytics-queue";
export type { CleanupJobData } from "./queues/cleanup-queue";
// Export
export type {
  ExportFormat,
  ExportJobData,
  ExportJobResult,
  ExportOptions,
  ExportScope,
  ExportStatus,
  ExportType,
} from "./queues/export-queue";
export {
  createAnalyticsExport,
  createAuditLogExport,
  createExportJob,
  createGDPRExport,
  createSearchResultsExport,
  getExportJobStatus,
} from "./queues/export-queue";
export type { GenericDocument, IndexJobData } from "./queues/index-queue";

// Notifications
export type {
  NotificationChannel,
  NotificationJobData,
  NotificationJobResult,
  NotificationPriority,
  NotificationType,
} from "./queues/notification-queue";
export {
  sendActionConfirmationRequest,
  sendAgentCompleteNotification,
  sendConnectorErrorNotification,
  sendNotification,
  sendNotificationsBatch,
  sendSearchAlert,
  sendUsageWarningNotification,
} from "./queues/notification-queue";
// Sync & Indexing
export type { SyncJobData } from "./queues/sync-queue";
export type { WebhookJobData } from "./queues/webhook-queue";
// === Rate Limiting ===
export type { RateLimitConfig } from "./rate-limiter";
export { DEFAULT_RATE_LIMITS, RateLimiter, rateLimiter } from "./rate-limiter";

// === Tracing ===
export {
  createLinkedSpan,
  extractTraceContext,
  injectTraceContext,
  type TraceContext,
} from "./utils/trace-context";
