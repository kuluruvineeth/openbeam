import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// === Analytics Query Types ===

export type InteractionType =
  | "VIEW"
  | "CLICK"
  | "SEARCH"
  | "COPY"
  | "SHARE"
  | "BOOKMARK"
  | "ASK";

export type PeriodType = "hourly" | "daily" | "monthly";

export interface DocumentAnalyticsResult {
  id: string;
  teamId: string;
  documentId: string;
  connectorId: string | null;
  totalViews: number;
  uniqueViewers: number;
  clicks: number;
  shares: number;
  bookmarks: number;
  copies: number;
  avgDwellTimeMs: number;
  popularityScore: number;
  trendingScore: number;
  lastViewedAt: Date | null;
}

export interface UserAnalyticsResult {
  id: string;
  teamId: string;
  userId: string;
  totalViews: number;
  totalSearches: number;
  totalClicks: number;
  avgDwellTimeMs: number;
  lastActiveAt: Date | null;
}

export interface QueryAnalyticsResult {
  id: string;
  teamId: string;
  queryHash: string;
  queryNormalized: string;
  totalSearches: number;
  uniqueUsers: number;
  avgResults: number;
  avgLatencyMs: number;
  clickThroughRate: number;
  searchesLastHour: number;
  searchesLastDay: number;
  searchesLastWeek: number;
}

export interface TeamUsageMetricsResult {
  id: string;
  teamId: string;
  periodType: string;
  periodStart: Date;
  totalSearches: number;
  uniqueSearchers: number;
  totalQuestions: number;
  documentsIndexed: number;
  documentsViewed: number;
  aiQueriesCount: number;
  aiTokensUsed: number;
}

// === Analytics Queries ===

/**
 * Get document analytics
 */
export const getDocumentAnalytics = async (
  db: Database,
  teamId: string,
  documentId: string
): Promise<DocumentAnalyticsResult | null> => {
  const analytics = await db.documentAnalytics.findUnique({
    where: {
      teamId_documentId: { teamId, documentId },
    },
  });

  if (!analytics) {
    return null;
  }

  return {
    id: analytics.id,
    teamId: analytics.teamId,
    documentId: analytics.documentId,
    connectorId: analytics.connectorId,
    totalViews: analytics.totalViews,
    uniqueViewers: analytics.uniqueViewers,
    clicks: analytics.clicks,
    shares: analytics.shares,
    bookmarks: analytics.bookmarks,
    copies: analytics.copies,
    avgDwellTimeMs: analytics.avgDwellTimeMs,
    popularityScore: analytics.popularityScore,
    trendingScore: analytics.trendingScore,
    lastViewedAt: analytics.lastViewedAt,
  };
};

/**
 * Get user analytics
 */
export const getUserAnalytics = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<UserAnalyticsResult | null> => {
  const analytics = await db.userAnalytics.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  });

  if (!analytics) {
    return null;
  }

  return {
    id: analytics.id,
    teamId: analytics.teamId,
    userId: analytics.userId,
    totalViews: analytics.totalViews,
    totalSearches: analytics.totalSearches,
    totalClicks: analytics.totalClicks,
    avgDwellTimeMs: analytics.avgDwellTimeMs,
    lastActiveAt: analytics.lastActiveAt,
  };
};

/**
 * Get top documents by popularity
 */
export const getTopDocuments = async (
  db: Database,
  teamId: string,
  options: {
    limit?: number;
    orderBy?: "popularity" | "trending" | "views";
  } = {}
): Promise<DocumentAnalyticsResult[]> => {
  const { limit = 10, orderBy = "popularity" } = options;

  const orderByField =
    orderBy === "popularity"
      ? { popularityScore: "desc" as const }
      : orderBy === "trending"
        ? { trendingScore: "desc" as const }
        : { totalViews: "desc" as const };

  const analytics = await db.documentAnalytics.findMany({
    where: { teamId },
    orderBy: orderByField,
    take: limit,
  });

  return analytics.map((a) => ({
    id: a.id,
    teamId: a.teamId,
    documentId: a.documentId,
    connectorId: a.connectorId,
    totalViews: a.totalViews,
    uniqueViewers: a.uniqueViewers,
    clicks: a.clicks,
    shares: a.shares,
    bookmarks: a.bookmarks,
    copies: a.copies,
    avgDwellTimeMs: a.avgDwellTimeMs,
    popularityScore: a.popularityScore,
    trendingScore: a.trendingScore,
    lastViewedAt: a.lastViewedAt,
  }));
};

/**
 * Get popular queries
 */
export const getPopularQueries = async (
  db: Database,
  teamId: string,
  options: { limit?: number; timeRange?: "hour" | "day" | "week" } = {}
): Promise<QueryAnalyticsResult[]> => {
  const { limit = 10, timeRange = "day" } = options;

  const orderByField =
    timeRange === "hour"
      ? { searchesLastHour: "desc" as const }
      : timeRange === "week"
        ? { searchesLastWeek: "desc" as const }
        : { searchesLastDay: "desc" as const };

  const queries = await db.queryAnalytics.findMany({
    where: { teamId },
    orderBy: orderByField,
    take: limit,
  });

  return queries.map((q) => ({
    id: q.id,
    teamId: q.teamId,
    queryHash: q.queryHash,
    queryNormalized: q.queryNormalized,
    totalSearches: q.totalSearches,
    uniqueUsers: q.uniqueUsers,
    avgResults: q.avgResults,
    avgLatencyMs: q.avgLatencyMs,
    clickThroughRate: q.clickThroughRate,
    searchesLastHour: q.searchesLastHour,
    searchesLastDay: q.searchesLastDay,
    searchesLastWeek: q.searchesLastWeek,
  }));
};

/**
 * Get team usage metrics for a period
 */
export const getTeamUsageMetrics = async (
  db: Database,
  teamId: string,
  periodType: PeriodType,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<TeamUsageMetricsResult[]> => {
  const where: Prisma.TeamUsageMetricsWhereInput = {
    teamId,
    periodType,
  };

  if (options.startDate || options.endDate) {
    where.periodStart = {};
    if (options.startDate) {
      where.periodStart.gte = options.startDate;
    }
    if (options.endDate) {
      where.periodStart.lte = options.endDate;
    }
  }

  const metrics = await db.teamUsageMetrics.findMany({
    where,
    orderBy: { periodStart: "desc" },
  });

  return metrics.map((m) => ({
    id: m.id,
    teamId: m.teamId,
    periodType: m.periodType,
    periodStart: m.periodStart,
    totalSearches: m.totalSearches,
    uniqueSearchers: m.uniqueSearchers,
    totalQuestions: m.totalQuestions,
    documentsIndexed: m.documentsIndexed,
    documentsViewed: m.documentsViewed,
    aiQueriesCount: m.aiQueriesCount,
    aiTokensUsed: m.aiTokensUsed,
  }));
};

/**
 * Get user interactions for a document
 */
export const getDocumentInteractions = async (
  db: Database,
  teamId: string,
  documentId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{
  interactions: Array<{
    id: string;
    userId: string;
    type: InteractionType;
    dwellTimeMs: number | null;
    createdAt: Date;
  }>;
  total: number;
}> => {
  const { limit = 50, offset = 0 } = options;

  const [interactions, total] = await Promise.all([
    db.userInteraction.findMany({
      where: { teamId, documentId },
      select: {
        id: true,
        userId: true,
        type: true,
        dwellTimeMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.userInteraction.count({
      where: { teamId, documentId },
    }),
  ]);

  return {
    interactions: interactions.map((i) => ({
      ...i,
      type: i.type as InteractionType,
    })),
    total,
  };
};

/**
 * Get search sessions for a user
 */
export const getUserSearchSessions = async (
  db: Database,
  teamId: string,
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{
  sessions: Array<{
    id: string;
    query: string;
    searchType: string;
    totalResults: number;
    latencyMs: number;
    aiAnswerGenerated: boolean;
    createdAt: Date;
  }>;
  total: number;
}> => {
  const { limit = 50, offset = 0 } = options;

  const [sessions, total] = await Promise.all([
    db.searchSession.findMany({
      where: { teamId, userId },
      select: {
        id: true,
        query: true,
        searchType: true,
        totalResults: true,
        latencyMs: true,
        aiAnswerGenerated: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.searchSession.count({
      where: { teamId, userId },
    }),
  ]);

  return { sessions, total };
};

/**
 * Get aggregated interaction counts by type for a time range
 */
export const getInteractionCountsByType = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<Record<InteractionType, number>> => {
  const where: Prisma.UserInteractionWhereInput = { teamId };

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const counts = await db.userInteraction.groupBy({
    by: ["type"],
    where,
    _count: { id: true },
  });

  const result: Record<InteractionType, number> = {
    VIEW: 0,
    CLICK: 0,
    SEARCH: 0,
    COPY: 0,
    SHARE: 0,
    BOOKMARK: 0,
    ASK: 0,
  };

  for (const count of counts) {
    result[count.type as InteractionType] = count._count.id;
  }

  return result;
};

/**
 * Get search count for time period
 */
export const getSearchCount = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<number> => {
  const where: Prisma.SearchSessionWhereInput = { teamId };

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  return db.searchSession.count({ where });
};

/**
 * Get unique searchers count for time period
 */
export const getUniqueSearchersCount = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<number> => {
  const where: Prisma.SearchSessionWhereInput = { teamId };

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const uniqueUsers = await db.searchSession.findMany({
    where,
    select: { userId: true },
    distinct: ["userId"],
  });

  return uniqueUsers.length;
};

/**
 * Get documents indexed count for time period
 */
export const getDocumentsIndexedCount = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<number> => {
  const where: Prisma.IndexedDocumentWhereInput = {
    connector: { teamId },
  };

  if (options.startDate || options.endDate) {
    where.indexedAt = {};
    if (options.startDate) {
      where.indexedAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.indexedAt.lte = options.endDate;
    }
  }

  return db.indexedDocument.count({ where });
};
