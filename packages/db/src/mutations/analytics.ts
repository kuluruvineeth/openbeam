import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";
import type { InteractionType, PeriodType } from "../queries/analytics";

// === Analytics Mutation Types ===

export interface TrackInteractionInput {
  teamId: string;
  userId: string;
  type: InteractionType;
  documentId?: string | null;
  documentType?: string | null;
  connectorId?: string | null;
  searchSessionId?: string | null;
  searchQuery?: string | null;
  resultPosition?: number | null;
  resultPage?: number | null;
  dwellTimeMs?: number | null;
  scrollDepth?: number | null;
  source?: string | null;
  referrer?: string | null;
  deviceType?: string | null;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface TrackSearchInput {
  sessionId: string;
  teamId: string;
  userId: string;
  query: string;
  searchType?: string;
  filters?: Record<string, unknown>;
  rankProfile?: string | null;
  totalResults: number;
  resultsShown: number;
  resultIds?: string[];
  resultTypes?: string[];
  latencyMs: number;
  aiAnswerGenerated?: boolean;
  timestamp?: Date;
}

export interface UpsertDocumentAnalyticsInput {
  teamId: string;
  documentId: string;
  connectorId?: string | null;
  views?: number;
  clicks?: number;
  shares?: number;
  bookmarks?: number;
  copies?: number;
}

export interface UpdatePopularityInput {
  teamId: string;
  documentIds?: string[];
}

// === Analytics Mutations ===

/**
 * Track a user interaction
 */
export const trackInteraction = async (
  db: Database,
  input: TrackInteractionInput
): Promise<string> => {
  const interaction = await db.userInteraction.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      type: input.type,
      documentId: input.documentId,
      documentType: input.documentType,
      connectorId: input.connectorId,
      searchSessionId: input.searchSessionId,
      searchQuery: input.searchQuery,
      resultPosition: input.resultPosition,
      resultPage: input.resultPage,
      dwellTimeMs: input.dwellTimeMs,
      scrollDepth: input.scrollDepth,
      source: input.source,
      referrer: input.referrer,
      deviceType: input.deviceType,
      metadata: input.metadata || {},
      createdAt: input.timestamp || new Date(),
    },
  });

  return interaction.id;
};

/**
 * Update document analytics after an interaction
 */
export const updateDocumentAnalyticsForInteraction = async (
  db: Database,
  teamId: string,
  documentId: string,
  connectorId: string | null,
  interactionType: InteractionType,
  timestamp: Date
): Promise<void> => {
  const incrementFields: Prisma.DocumentAnalyticsUpdateInput = {
    lastViewedAt: timestamp,
  };

  switch (interactionType) {
    case "VIEW":
      incrementFields.totalViews = { increment: 1 };
      break;
    case "CLICK":
      incrementFields.clicks = { increment: 1 };
      break;
    case "SHARE":
      incrementFields.shares = { increment: 1 };
      break;
    case "BOOKMARK":
      incrementFields.bookmarks = { increment: 1 };
      break;
    case "COPY":
      incrementFields.copies = { increment: 1 };
      break;
  }

  await db.documentAnalytics.upsert({
    where: {
      teamId_documentId: { teamId, documentId },
    },
    update: incrementFields,
    create: {
      teamId,
      documentId,
      connectorId,
      totalViews: interactionType === "VIEW" ? 1 : 0,
      clicks: interactionType === "CLICK" ? 1 : 0,
      shares: interactionType === "SHARE" ? 1 : 0,
      bookmarks: interactionType === "BOOKMARK" ? 1 : 0,
      copies: interactionType === "COPY" ? 1 : 0,
      firstViewedAt: timestamp,
      lastViewedAt: timestamp,
    },
  });
};

/**
 * Track a search session
 */
export const trackSearch = async (
  db: Database,
  input: TrackSearchInput
): Promise<string> => {
  const session = await db.searchSession.create({
    data: {
      id: input.sessionId,
      teamId: input.teamId,
      userId: input.userId,
      query: input.query,
      queryNormalized: input.query.toLowerCase().trim(),
      searchType: input.searchType || "hybrid",
      filters: input.filters || {},
      rankProfile: input.rankProfile,
      totalResults: input.totalResults,
      resultsShown: input.resultsShown,
      resultIds: input.resultIds || [],
      resultTypes: input.resultTypes || [],
      latencyMs: input.latencyMs,
      aiAnswerGenerated: input.aiAnswerGenerated,
      createdAt: input.timestamp || new Date(),
    },
  });

  return session.id;
};

/**
 * Update query analytics after a search
 */
export const updateQueryAnalytics = async (
  db: Database,
  teamId: string,
  query: string,
  totalResults: number,
  latencyMs: number,
  timestamp: Date
): Promise<void> => {
  const queryHash = hashQuery(query);

  await db.queryAnalytics.upsert({
    where: {
      teamId_queryHash: { teamId, queryHash },
    },
    update: {
      totalSearches: { increment: 1 },
      lastSearchedAt: timestamp,
      searchesLastHour: { increment: 1 },
      searchesLastDay: { increment: 1 },
      searchesLastWeek: { increment: 1 },
    },
    create: {
      teamId,
      queryHash,
      queryNormalized: query.toLowerCase().trim(),
      totalSearches: 1,
      uniqueUsers: 1,
      avgResults: totalResults,
      avgLatencyMs: latencyMs,
      firstSearchedAt: timestamp,
      lastSearchedAt: timestamp,
    },
  });
};

/**
 * Update user analytics
 */
export const updateUserAnalytics = async (
  db: Database,
  teamId: string,
  userId: string,
  updates: {
    views?: number;
    searches?: number;
    clicks?: number;
    dwellTimeMs?: number;
  }
): Promise<void> => {
  const updateFields: Prisma.UserAnalyticsUpdateInput = {
    lastActiveAt: new Date(),
    updatedAt: new Date(),
  };

  if (updates.views) {
    updateFields.totalViews = { increment: updates.views };
  }
  if (updates.searches) {
    updateFields.totalSearches = { increment: updates.searches };
  }
  if (updates.clicks) {
    updateFields.totalClicks = { increment: updates.clicks };
  }

  await db.userAnalytics.upsert({
    where: {
      teamId_userId: { teamId, userId },
    },
    update: updateFields,
    create: {
      teamId,
      userId,
      totalViews: updates.views || 0,
      totalSearches: updates.searches || 0,
      totalClicks: updates.clicks || 0,
      avgDwellTimeMs: updates.dwellTimeMs || 0,
      lastActiveAt: new Date(),
    },
  });
};

/**
 * Upsert team usage metrics
 */
export const upsertTeamUsageMetrics = async (
  db: Database,
  teamId: string,
  periodType: PeriodType,
  periodStart: Date,
  metrics: {
    totalSearches?: number;
    uniqueSearchers?: number;
    totalQuestions?: number;
    documentsIndexed?: number;
    documentsViewed?: number;
    aiQueriesCount?: number;
    aiTokensUsed?: number;
  }
): Promise<void> => {
  await db.teamUsageMetrics.upsert({
    where: {
      teamId_periodType_periodStart: {
        teamId,
        periodType,
        periodStart,
      },
    },
    update: {
      ...metrics,
      updatedAt: new Date(),
    },
    create: {
      teamId,
      periodType,
      periodStart,
      totalSearches: metrics.totalSearches || 0,
      uniqueSearchers: metrics.uniqueSearchers || 0,
      totalQuestions: metrics.totalQuestions || 0,
      documentsIndexed: metrics.documentsIndexed || 0,
      documentsViewed: metrics.documentsViewed || 0,
      aiQueriesCount: metrics.aiQueriesCount || 0,
      aiTokensUsed: metrics.aiTokensUsed || 0,
    },
  });
};

/**
 * Calculate and update popularity scores for documents
 */
export const updatePopularityScores = async (
  db: Database,
  teamId: string,
  documentIds?: string[]
): Promise<number> => {
  const where: Prisma.DocumentAnalyticsWhereInput = { teamId };
  if (documentIds) {
    where.documentId = { in: documentIds };
  }

  const docs = await db.documentAnalytics.findMany({ where });

  let updated = 0;
  for (const doc of docs) {
    const viewScore = Math.log(doc.totalViews + 1) * 10;
    const clickScore = Math.log(doc.clicks + 1) * 20;
    const shareScore = Math.log(doc.shares + 1) * 30;
    const bookmarkScore = Math.log(doc.bookmarks + 1) * 25;

    const popularityScore = Math.min(
      100,
      viewScore + clickScore + shareScore + bookmarkScore
    );

    const trendingScore = Math.min(
      100,
      (doc.viewsLastDay * 2 + doc.viewsLastHour * 10) / 10
    );

    await db.documentAnalytics.update({
      where: { id: doc.id },
      data: {
        popularityScore,
        trendingScore,
        updatedAt: new Date(),
      },
    });

    updated++;
  }

  return updated;
};

/**
 * Reset hourly counters (for scheduled job)
 */
export const resetHourlyCounters = async (
  db: Database,
  teamId: string
): Promise<void> => {
  await db.documentAnalytics.updateMany({
    where: { teamId },
    data: {
      viewsLastHour: 0,
    },
  });

  await db.queryAnalytics.updateMany({
    where: { teamId },
    data: {
      searchesLastHour: 0,
    },
  });
};

/**
 * Reset daily counters (for scheduled job)
 */
export const resetDailyCounters = async (
  db: Database,
  teamId: string
): Promise<void> => {
  await db.documentAnalytics.updateMany({
    where: { teamId },
    data: {
      viewsLastDay: 0,
    },
  });

  await db.queryAnalytics.updateMany({
    where: { teamId },
    data: {
      searchesLastDay: 0,
    },
  });
};

/**
 * Reset weekly counters (for scheduled job)
 */
export const resetWeeklyCounters = async (
  db: Database,
  teamId: string
): Promise<void> => {
  await db.queryAnalytics.updateMany({
    where: { teamId },
    data: {
      searchesLastWeek: 0,
    },
  });
};

/**
 * Delete old interactions (for data retention)
 */
export const deleteOldInteractions = async (
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<number> => {
  const result = await db.userInteraction.deleteMany({
    where: {
      teamId,
      createdAt: { lt: olderThan },
    },
  });

  return result.count;
};

/**
 * Delete old search sessions (for data retention)
 */
export const deleteOldSearchSessions = async (
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<number> => {
  const result = await db.searchSession.deleteMany({
    where: {
      teamId,
      createdAt: { lt: olderThan },
    },
  });

  return result.count;
};

// === Helper Functions ===

/**
 * Hash a query for deduplication and aggregation
 */
function hashQuery(query: string): string {
  const normalized = query.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return Math.abs(hash).toString(36);
}
