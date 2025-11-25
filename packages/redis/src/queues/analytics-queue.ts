/**
 * Analytics Queue
 *
 * Handles async analytics processing for user interactions, search analytics,
 * and document popularity scoring.
 * Supports the analytics.prisma models.
 */
import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

// === Analytics Event Types ===

export type InteractionType =
  // Search & Discovery
  | "search"
  | "view"
  | "click"
  | "preview"
  | "expand"
  // Engagement
  | "copy"
  | "share"
  | "bookmark"
  | "upvote"
  | "downvote"
  | "comment"
  // AI Interactions
  | "ask"
  | "feedback_positive"
  | "feedback_negative"
  | "citation_click"
  | "regenerate"
  // Navigation
  | "filter"
  | "sort"
  | "page"
  // Actions
  | "action_triggered"
  | "export"
  | "download";

export type AnalyticsJobType =
  | "track_interaction" // Single user interaction
  | "track_search" // Search session tracking
  | "aggregate_query" // Aggregate query analytics
  | "aggregate_document" // Aggregate document analytics
  | "aggregate_user" // Aggregate user analytics
  | "aggregate_team" // Team usage metrics
  | "update_popularity" // Update document popularity scores
  | "sync_to_vespa"; // Sync popularity scores to Vespa

// === Job Data Interfaces ===

export interface TrackInteractionData {
  type: "track_interaction";
  teamId: string;
  userId: string;
  interactionType: InteractionType;
  documentId?: string;
  documentType?: string;
  connectorId?: string;

  // Search context
  searchSessionId?: string;
  searchQuery?: string;
  resultPosition?: number;
  resultPage?: number;

  // Engagement metrics
  dwellTimeMs?: number;
  scrollDepth?: number;

  // Context
  source?: string; // "search", "chat", "browse", "notification", "api"
  referrer?: string;
  deviceType?: string;

  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface TrackSearchData {
  type: "track_search";
  sessionId: string;
  teamId: string;
  userId: string;

  // Search details
  query: string;
  searchType?: string; // "bm25", "semantic", "hybrid"
  filters?: Record<string, unknown>;
  rankProfile?: string;

  // Results
  totalResults: number;
  resultsShown: number;
  resultIds: string[];
  resultTypes: string[];

  // Performance
  latencyMs: number;

  // AI
  aiAnswerGenerated?: boolean;

  timestamp: number;
}

export interface AggregateQueryData {
  type: "aggregate_query";
  teamId: string;
  timeRange: "hourly" | "daily" | "weekly";
}

export interface AggregateDocumentData {
  type: "aggregate_document";
  teamId: string;
  documentId?: string; // If null, aggregate all
  timeRange: "hourly" | "daily" | "weekly";
}

export interface AggregateUserData {
  type: "aggregate_user";
  teamId: string;
  userId?: string; // If null, aggregate all
}

export interface AggregateTeamData {
  type: "aggregate_team";
  teamId: string;
  periodType: "hourly" | "daily" | "monthly";
  periodStart: number;
}

export interface UpdatePopularityData {
  type: "update_popularity";
  teamId: string;
  documentIds?: string[]; // If null, update all
}

export interface SyncToVespaData {
  type: "sync_to_vespa";
  teamId: string;
  documentIds: string[];
  scores: Array<{
    documentId: string;
    popularityScore: number;
    trendingScore: number;
    qualityScore: number;
  }>;
}

export type AnalyticsJobData = (
  | TrackInteractionData
  | TrackSearchData
  | AggregateQueryData
  | AggregateDocumentData
  | AggregateUserData
  | AggregateTeamData
  | UpdatePopularityData
  | SyncToVespaData
) & {
  traceContext?: TraceContext;
};

// === Queue Configuration ===

export const ANALYTICS_QUEUE_NAME = "analytics";

export const analyticsQueue = new Queue<AnalyticsJobData>(
  ANALYTICS_QUEUE_NAME,
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000,
        age: 3600, // Keep for 1 hour
      },
      removeOnFail: {
        count: 5000,
        age: 24 * 3600, // Keep failures for 24 hours
      },
    },
  }
);

// === Tracking Functions ===

/**
 * Track a user interaction (async, fire-and-forget)
 */
export async function trackInteraction(
  data: Omit<TrackInteractionData, "type" | "timestamp" | "traceContext">
) {
  const jobData: TrackInteractionData = {
    type: "track_interaction",
    ...data,
    timestamp: Date.now(),
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("track-interaction", jobData, {
    priority: 1, // Low priority
    jobId: `interaction-${data.teamId}-${data.userId}-${Date.now()}`,
  });
}

/**
 * Track a search session
 */
export async function trackSearch(
  data: Omit<TrackSearchData, "type" | "timestamp" | "traceContext">
) {
  const jobData: TrackSearchData = {
    type: "track_search",
    ...data,
    timestamp: Date.now(),
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("track-search", jobData, {
    priority: 2,
    jobId: `search-${data.sessionId}`,
  });
}

/**
 * Batch track multiple interactions (more efficient)
 */
export async function trackInteractionsBatch(
  interactions: Array<Omit<TrackInteractionData, "type" | "timestamp">>
) {
  const jobs = interactions.map((data, index) => ({
    name: "track-interaction",
    data: {
      type: "track_interaction" as const,
      ...data,
      timestamp: Date.now(),
      traceContext: extractTraceContext(),
    },
    opts: {
      priority: 1,
      jobId: `interaction-batch-${Date.now()}-${index}`,
    },
  }));

  return await analyticsQueue.addBulk(jobs);
}

// === Aggregation Functions ===

/**
 * Schedule query analytics aggregation
 */
export async function scheduleQueryAggregation(
  teamId: string,
  timeRange: "hourly" | "daily" | "weekly"
) {
  const jobData: AggregateQueryData = {
    type: "aggregate_query",
    teamId,
    timeRange,
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("aggregate-query", jobData, {
    priority: 3,
    jobId: `aggregate-query-${teamId}-${timeRange}-${Date.now()}`,
  });
}

/**
 * Schedule document analytics aggregation
 */
export async function scheduleDocumentAggregation(
  teamId: string,
  documentId?: string,
  timeRange: "hourly" | "daily" | "weekly" = "hourly"
) {
  const jobData: AggregateDocumentData = {
    type: "aggregate_document",
    teamId,
    documentId,
    timeRange,
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("aggregate-document", jobData, {
    priority: 3,
    jobId: documentId
      ? `aggregate-doc-${documentId}-${timeRange}`
      : `aggregate-docs-${teamId}-${timeRange}-${Date.now()}`,
  });
}

/**
 * Schedule user analytics aggregation
 */
export async function scheduleUserAggregation(teamId: string, userId?: string) {
  const jobData: AggregateUserData = {
    type: "aggregate_user",
    teamId,
    userId,
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("aggregate-user", jobData, {
    priority: 3,
    jobId: userId
      ? `aggregate-user-${userId}`
      : `aggregate-users-${teamId}-${Date.now()}`,
  });
}

/**
 * Schedule team usage metrics aggregation
 */
export async function scheduleTeamAggregation(
  teamId: string,
  periodType: "hourly" | "daily" | "monthly",
  periodStart: Date
) {
  const jobData: AggregateTeamData = {
    type: "aggregate_team",
    teamId,
    periodType,
    periodStart: periodStart.getTime(),
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("aggregate-team", jobData, {
    priority: 3,
    jobId: `aggregate-team-${teamId}-${periodType}-${periodStart.getTime()}`,
  });
}

/**
 * Schedule popularity score update
 */
export async function schedulePopularityUpdate(
  teamId: string,
  documentIds?: string[]
) {
  const jobData: UpdatePopularityData = {
    type: "update_popularity",
    teamId,
    documentIds,
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("update-popularity", jobData, {
    priority: 4,
    jobId: documentIds
      ? `popularity-${teamId}-${documentIds.join("-").slice(0, 50)}`
      : `popularity-${teamId}-all-${Date.now()}`,
  });
}

/**
 * Schedule Vespa sync for popularity scores
 */
export async function scheduleSyncToVespa(data: Omit<SyncToVespaData, "type">) {
  const jobData: SyncToVespaData = {
    type: "sync_to_vespa",
    ...data,
    traceContext: extractTraceContext(),
  };

  return await analyticsQueue.add("sync-to-vespa", jobData, {
    priority: 5,
    jobId: `vespa-sync-${data.teamId}-${Date.now()}`,
  });
}

// === Scheduled Aggregations ===

/**
 * Create repeatable aggregation jobs
 */
export async function createRepeatableAggregations(
  teamId: string
): Promise<string[]> {
  const schedulerIds: string[] = [];

  // Hourly query aggregation
  const hourlyQueryId = `aggregate-query-hourly-${teamId}`;
  await analyticsQueue.upsertJobScheduler(
    hourlyQueryId,
    { pattern: "0 * * * *" }, // Every hour
    {
      name: "aggregate-query-hourly",
      data: {
        type: "aggregate_query",
        teamId,
        timeRange: "hourly",
      },
    }
  );
  schedulerIds.push(hourlyQueryId);

  // Daily document aggregation
  const dailyDocId = `aggregate-document-daily-${teamId}`;
  await analyticsQueue.upsertJobScheduler(
    dailyDocId,
    { pattern: "0 2 * * *" }, // Daily at 2 AM
    {
      name: "aggregate-document-daily",
      data: {
        type: "aggregate_document",
        teamId,
        timeRange: "daily",
      },
    }
  );
  schedulerIds.push(dailyDocId);

  // Daily popularity update
  const dailyPopularityId = `update-popularity-daily-${teamId}`;
  await analyticsQueue.upsertJobScheduler(
    dailyPopularityId,
    { pattern: "0 3 * * *" }, // Daily at 3 AM
    {
      name: "update-popularity-daily",
      data: {
        type: "update_popularity",
        teamId,
      },
    }
  );
  schedulerIds.push(dailyPopularityId);

  return schedulerIds;
}

/**
 * Get analytics queue metrics
 */
export async function getAnalyticsQueueMetrics() {
  const counts = await analyticsQueue.getJobCounts();
  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    total:
      (counts.waiting || 0) +
      (counts.active || 0) +
      (counts.completed || 0) +
      (counts.failed || 0) +
      (counts.delayed || 0),
  };
}

/**
 * Close the analytics queue
 */
export async function closeAnalyticsQueue(): Promise<void> {
  await analyticsQueue.close();
}
