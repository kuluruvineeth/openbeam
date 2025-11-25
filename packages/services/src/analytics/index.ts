/**
 * Analytics Service
 * Business logic for user interactions, search analytics, and usage metrics
 *
 * Uses @openplane/db for all database operations.
 */

import prisma, {
  type DocumentAnalyticsResult,
  getDocumentAnalytics as dbGetDocumentAnalytics,
  getTeamUsageMetrics as dbGetTeamUsageMetrics,
  getUserAnalytics as dbGetUserAnalytics,
  trackInteraction as dbTrackInteraction,
  trackSearch as dbTrackSearch,
  getPopularQueries,
  getSearchCount,
  getUniqueSearchersCount,
  type InteractionType,
  type PeriodType,
  updateDocumentAnalyticsForInteraction,
  updateQueryAnalytics,
  updateUserAnalytics,
} from "@openplane/db";

// ============================================================================
// Types
// ============================================================================

export interface TrackInteractionParams {
  teamId: string;
  userId: string;
  type: string;
  documentId?: string;
  documentType?: string;
  connectorId?: string;
  searchSessionId?: string;
  searchQuery?: string;
  resultPosition?: number;
  dwellTimeMs?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackSearchParams {
  teamId: string;
  userId: string;
  query: string;
  searchType?: string;
  filters?: Record<string, unknown>;
  totalResults: number;
  resultsShown: number;
  resultIds?: string[];
  latencyMs?: number;
  aiAnswerGenerated?: boolean;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  avgLatencyMs: number;
  avgResultsPerSearch: number;
  clickThroughRate: number;
  topQueries: Array<{ query: string; count: number }>;
  searchesByDay: Array<{ date: string; count: number }>;
}

export interface DocumentAnalytics {
  documentId: string;
  totalViews: number;
  uniqueViewers: number;
  avgDwellTimeMs: number;
  impressions: number;
  clicks: number;
  ctr: number;
  popularityScore: number;
}

export interface UserAnalytics {
  userId: string;
  totalSearches: number;
  totalViews: number;
  topDocumentTypes: Array<{ type: string; count: number }>;
  topConnectors: Array<{ connector: string; count: number }>;
  lastActiveAt: string;
}

export interface TeamUsageMetrics {
  periodStart: string;
  periodEnd: string;
  totalSearches: number;
  totalDocuments: number;
  activeUsers: number;
  aiQueriesUsed: number;
  storageUsedGb: number;
}

// ============================================================================
// Analytics Service Functions
// ============================================================================

/**
 * Track a user interaction
 */
export async function trackInteraction(
  params: TrackInteractionParams
): Promise<void> {
  const interactionType = mapInteractionType(params.type);

  await dbTrackInteraction(prisma, {
    teamId: params.teamId,
    userId: params.userId,
    type: interactionType,
    documentId: params.documentId,
    documentType: params.documentType,
    connectorId: params.connectorId,
    searchSessionId: params.searchSessionId,
    searchQuery: params.searchQuery,
    resultPosition: params.resultPosition,
    dwellTimeMs: params.dwellTimeMs,
    source: params.source,
    metadata: params.metadata,
  });

  // Update document analytics if this is a document interaction
  if (params.documentId && params.type) {
    await updateDocumentAnalyticsForInteraction(
      prisma,
      params.teamId,
      params.documentId,
      params.connectorId || null,
      interactionType,
      new Date()
    );
  }

  // Update user analytics
  await updateUserAnalytics(prisma, params.teamId, params.userId, {
    views: interactionType === "VIEW" ? 1 : 0,
    clicks: interactionType === "CLICK" ? 1 : 0,
    dwellTimeMs: params.dwellTimeMs,
  });
}

/**
 * Track a search session
 */
export async function trackSearch(params: TrackSearchParams): Promise<string> {
  const sessionId = generateSessionId();

  await dbTrackSearch(prisma, {
    sessionId,
    teamId: params.teamId,
    userId: params.userId,
    query: params.query,
    searchType: params.searchType,
    filters: params.filters,
    totalResults: params.totalResults,
    resultsShown: params.resultsShown,
    resultIds: params.resultIds,
    latencyMs: params.latencyMs || 0,
    aiAnswerGenerated: params.aiAnswerGenerated,
  });

  // Update query analytics
  await updateQueryAnalytics(
    prisma,
    params.teamId,
    params.query,
    params.totalResults,
    params.latencyMs || 0,
    new Date()
  );

  // Update user analytics
  await updateUserAnalytics(prisma, params.teamId, params.userId, {
    searches: 1,
  });

  return sessionId;
}

/**
 * Update search session with click data
 */
export async function updateSearchSession(
  sessionId: string,
  updates: {
    hasClicks?: boolean;
    clickCount?: number;
    firstClickPosition?: number;
    lastClickPosition?: number;
    reformulated?: boolean;
    abandoned?: boolean;
    successful?: boolean;
    aiAnswerClicked?: boolean;
    aiAnswerFeedback?: string;
  }
): Promise<void> {
  await prisma.searchSession.update({
    where: { id: sessionId },
    data: updates,
  });
}

/**
 * Get search analytics for a team
 */
export async function getSearchAnalytics(
  teamId: string,
  options: { days?: number } = {}
): Promise<SearchAnalytics> {
  const { days = 30 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalSearches, _uniqueSearchers, popularQueries] = await Promise.all([
    getSearchCount(prisma, teamId, { startDate }),
    getUniqueSearchersCount(prisma, teamId, { startDate }),
    getPopularQueries(prisma, teamId, { limit: 10, timeRange: "day" }),
  ]);

  // Calculate CTR from search sessions with clicks
  const sessionsWithClicks = await prisma.searchSession.count({
    where: {
      teamId,
      createdAt: { gte: startDate },
      hasClicks: true,
    },
  });

  const ctr = totalSearches > 0 ? sessionsWithClicks / totalSearches : 0;

  // Get average latency and results
  const avgStats = await prisma.searchSession.aggregate({
    where: {
      teamId,
      createdAt: { gte: startDate },
    },
    _avg: {
      latencyMs: true,
      totalResults: true,
    },
  });

  return {
    totalSearches,
    uniqueQueries: popularQueries.length,
    avgLatencyMs: avgStats._avg.latencyMs || 0,
    avgResultsPerSearch: avgStats._avg.totalResults || 0,
    clickThroughRate: ctr,
    topQueries: popularQueries.map((q) => ({
      query: q.queryNormalized,
      count: q.totalSearches,
    })),
    searchesByDay: [], // Would need daily aggregation query
  };
}

/**
 * Get document analytics
 */
export async function getDocumentAnalytics(
  documentId: string,
  teamId: string
): Promise<DocumentAnalytics | null> {
  const analytics = await dbGetDocumentAnalytics(prisma, teamId, documentId);

  if (!analytics) {
    return null;
  }

  return mapDocumentAnalytics(analytics);
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(
  userId: string,
  teamId: string
): Promise<UserAnalytics | null> {
  const analytics = await dbGetUserAnalytics(prisma, teamId, userId);

  if (!analytics) {
    return null;
  }

  return {
    userId: analytics.userId,
    totalSearches: analytics.totalSearches,
    totalViews: analytics.totalViews,
    topDocumentTypes: [], // Would need additional aggregation
    topConnectors: [], // Would need additional aggregation
    lastActiveAt:
      analytics.lastActiveAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Get team usage metrics
 */
export async function getTeamUsageMetrics(
  teamId: string,
  options: { periodType?: "daily" | "monthly"; limit?: number } = {}
): Promise<TeamUsageMetrics[]> {
  const { periodType = "daily", limit = 30 } = options;

  const dbPeriodType: PeriodType = periodType;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(
    startDate.getDate() - (periodType === "daily" ? limit : limit * 30)
  );

  const metrics = await dbGetTeamUsageMetrics(prisma, teamId, dbPeriodType, {
    startDate,
    endDate,
  });

  return metrics.slice(0, limit).map((m) => ({
    periodStart: m.periodStart.toISOString(),
    periodEnd: new Date(
      m.periodStart.getTime() +
        (periodType === "daily" ? 86_400_000 : 2_592_000_000)
    ).toISOString(),
    totalSearches: m.totalSearches,
    totalDocuments: m.documentsIndexed,
    activeUsers: m.uniqueSearchers,
    aiQueriesUsed: m.aiQueriesCount,
    storageUsedGb: 0, // Would need storage tracking
  }));
}

/**
 * Record feedback
 */
export async function recordFeedback(params: {
  teamId: string;
  userId: string;
  type: "search_result" | "ai_answer" | "document" | "suggestion" | "feature";
  sentiment: "positive" | "negative" | "neutral";
  documentId?: string;
  searchSessionId?: string;
  conversationId?: string;
  rating?: number;
  comment?: string;
  query?: string;
  answer?: string;
}): Promise<void> {
  await prisma.feedback.create({
    data: {
      teamId: params.teamId,
      userId: params.userId,
      type: mapFeedbackType(params.type),
      sentiment: mapSentiment(params.sentiment),
      documentId: params.documentId,
      searchSessionId: params.searchSessionId,
      conversationId: params.conversationId,
      rating: params.rating,
      comment: params.comment,
      query: params.query,
      answer: params.answer,
    },
  });
}

// ============================================================================
// Private Helpers
// ============================================================================

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function mapInteractionType(type: string): InteractionType {
  const mapping: Record<string, InteractionType> = {
    view: "VIEW",
    click: "CLICK",
    search: "SEARCH",
    copy: "COPY",
    share: "SHARE",
    bookmark: "BOOKMARK",
    ask: "ASK",
  };
  return mapping[type.toLowerCase()] || "VIEW";
}

function mapFeedbackType(
  type: string
): "SEARCH_RESULT" | "AI_ANSWER" | "DOCUMENT" | "SUGGESTION" | "FEATURE" {
  const mapping: Record<
    string,
    "SEARCH_RESULT" | "AI_ANSWER" | "DOCUMENT" | "SUGGESTION" | "FEATURE"
  > = {
    search_result: "SEARCH_RESULT",
    ai_answer: "AI_ANSWER",
    document: "DOCUMENT",
    suggestion: "SUGGESTION",
    feature: "FEATURE",
  };
  return mapping[type] || "FEATURE";
}

function mapSentiment(sentiment: string): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  const mapping: Record<string, "POSITIVE" | "NEGATIVE" | "NEUTRAL"> = {
    positive: "POSITIVE",
    negative: "NEGATIVE",
    neutral: "NEUTRAL",
  };
  return mapping[sentiment] || "NEUTRAL";
}

function mapDocumentAnalytics(
  analytics: DocumentAnalyticsResult
): DocumentAnalytics {
  const impressions = analytics.totalViews;
  const clicks = analytics.clicks;
  const ctr = impressions > 0 ? clicks / impressions : 0;

  return {
    documentId: analytics.documentId,
    totalViews: analytics.totalViews,
    uniqueViewers: analytics.uniqueViewers,
    avgDwellTimeMs: analytics.avgDwellTimeMs,
    impressions,
    clicks,
    ctr,
    popularityScore: analytics.popularityScore,
  };
}

// ============================================================================
// Re-export types
// ============================================================================

export type {
  DocumentAnalytics,
  SearchAnalytics,
  TeamUsageMetrics,
  UserAnalytics,
};
