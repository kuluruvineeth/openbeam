/**
 * Preferences Queries
 * Query functions for user preferences, pinned items, and recent items
 */

import type {
  AnswerCard,
  KnowledgeSnippet,
  PinnedItem,
  PrismaClient,
  RecentItem,
  SavedSearch,
  SearchSuggestion,
  UserPreferences,
} from "../../prisma/generated/client";

// ============================================================================
// Types
// ============================================================================

export interface UserPreferencesResult {
  id: string;
  teamId: string;
  userId: string;
  defaultSearchScope: string[];
  defaultDocTypes: string[];
  defaultRankProfile: string;
  searchResultSize: number;
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  emailDigest: string;
  searchAlerts: boolean;
  mentionNotifications: boolean;
  aiEnabled: boolean;
  showAiAnswers: boolean;
  aiModel: string | null;
  trackHistory: boolean;
  shareActivity: boolean;
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  featureFlags: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PinnedItemResult {
  id: string;
  teamId: string;
  userId: string;
  itemType: string;
  itemId: string;
  title: string | null;
  icon: string | null;
  url: string | null;
  location: string;
  order: number;
  createdAt: Date;
}

export interface RecentItemResult {
  id: string;
  teamId: string;
  userId: string;
  itemType: string;
  itemId: string;
  title: string | null;
  url: string | null;
  accessCount: number;
  lastAccessedAt: Date;
}

export interface SavedSearchResult {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  description: string | null;
  query: string;
  filters: Record<string, unknown>;
  sortBy: string | null;
  sortOrder: string;
  rankProfile: string;
  connectorIds: string[];
  projectIds: string[];
  viewMode: string;
  pageSize: number;
  visibility: string;
  alertEnabled: boolean;
  alertFrequency: string | null;
  lastAlertAt: Date | null;
  runCount: number;
  lastRunAt: Date | null;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnswerCardResult {
  id: string;
  teamId: string;
  question: string;
  questionVariants: string[];
  answer: string;
  answerType: string;
  dynamicConfig: Record<string, unknown> | null;
  sourceDocumentIds: string[];
  category: string | null;
  tags: string[];
  icon: string | null;
  isPublished: boolean;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// User Preferences Queries
// ============================================================================

/**
 * Get user preferences by user ID
 */
export const getUserPreferences = async (
  prisma: PrismaClient,
  userId: string
): Promise<UserPreferences | null> =>
  prisma.userPreferences.findUnique({
    where: { userId },
  });

/**
 * Get user preferences by team and user
 */
export const getUserPreferencesByTeam = async (
  prisma: PrismaClient,
  teamId: string,
  userId: string
): Promise<UserPreferences | null> =>
  prisma.userPreferences.findFirst({
    where: { teamId, userId },
  });

// ============================================================================
// Pinned Items Queries
// ============================================================================

/**
 * Get pinned items for a user
 */
export const getPinnedItems = (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    location?: string;
  }
): Promise<PinnedItem[]> => {
  const { teamId, userId, location } = options;

  return prisma.pinnedItem.findMany({
    where: {
      teamId,
      userId,
      ...(location && { location }),
    },
    orderBy: { order: "asc" },
  });
};

/**
 * Get max order for pinned items in a location
 */
export const getMaxPinnedItemOrder = async (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    location: string;
  }
): Promise<number> => {
  const { teamId, userId, location } = options;

  const maxOrderItem = await prisma.pinnedItem.findFirst({
    where: { teamId, userId, location },
    orderBy: { order: "desc" },
  });

  return maxOrderItem?.order ?? 0;
};

// ============================================================================
// Recent Items Queries
// ============================================================================

/**
 * Get recent items for a user
 */
export const getRecentItems = (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    itemType?: string;
    limit?: number;
  }
): Promise<RecentItem[]> => {
  const { teamId, userId, itemType, limit = 20 } = options;

  return prisma.recentItem.findMany({
    where: {
      teamId,
      userId,
      ...(itemType && { itemType }),
    },
    orderBy: { lastAccessedAt: "desc" },
    take: limit,
  });
};

// ============================================================================
// Saved Searches Queries
// ============================================================================

/**
 * Get saved searches for a user
 */
export const getSavedSearches = async (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    visibility?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ searches: SavedSearch[]; total: number }> => {
  const { teamId, userId, visibility, limit = 20, offset = 0 } = options;

  const where = {
    teamId,
    OR: [
      { userId },
      { visibility: "TEAM" as const },
      { visibility: "PUBLIC" as const },
    ],
    ...(visibility && {
      visibility: visibility as "PRIVATE" | "TEAM" | "PUBLIC",
    }),
  };

  const [searches, total] = await Promise.all([
    prisma.savedSearch.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { lastRunAt: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.savedSearch.count({ where }),
  ]);

  return { searches, total };
};

/**
 * Get a saved search by ID
 */
export const getSavedSearch = async (
  prisma: PrismaClient,
  searchId: string,
  teamId: string
): Promise<SavedSearch | null> =>
  prisma.savedSearch.findFirst({
    where: { id: searchId, teamId },
  });

/**
 * Get featured saved searches for a team
 */
export const getFeaturedSearches = async (
  prisma: PrismaClient,
  teamId: string,
  limit = 10
): Promise<SavedSearch[]> =>
  prisma.savedSearch.findMany({
    where: {
      teamId,
      isFeatured: true,
      visibility: { in: ["TEAM", "PUBLIC"] },
    },
    orderBy: { runCount: "desc" },
    take: limit,
  });

// ============================================================================
// Answer Cards Queries
// ============================================================================

/**
 * Get answer cards for a team
 */
export const getAnswerCards = async (
  prisma: PrismaClient,
  options: {
    teamId: string;
    category?: string;
    isPublished?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{ cards: AnswerCard[]; total: number }> => {
  const {
    teamId,
    category,
    isPublished = true,
    limit = 20,
    offset = 0,
  } = options;

  const where = {
    teamId,
    isPublished,
    ...(category && { category }),
  };

  const [cards, total] = await Promise.all([
    prisma.answerCard.findMany({
      where,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.answerCard.count({ where }),
  ]);

  return { cards, total };
};

/**
 * Get an answer card by ID
 */
export const getAnswerCard = async (
  prisma: PrismaClient,
  cardId: string,
  teamId: string
): Promise<AnswerCard | null> =>
  prisma.answerCard.findFirst({
    where: { id: cardId, teamId },
  });

// ============================================================================
// Knowledge Snippets Queries
// ============================================================================

/**
 * Get knowledge snippets for a team
 */
export const getKnowledgeSnippets = async (
  prisma: PrismaClient,
  options: {
    teamId: string;
    snippetType?: string;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{ snippets: KnowledgeSnippet[]; total: number }> => {
  const { teamId, snippetType, isVerified, limit = 20, offset = 0 } = options;

  const where = {
    teamId,
    ...(snippetType && { snippetType }),
    ...(isVerified !== undefined && { isVerified }),
  };

  const [snippets, total] = await Promise.all([
    prisma.knowledgeSnippet.findMany({
      where,
      orderBy: [{ confidence: "desc" }, { citationCount: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.knowledgeSnippet.count({ where }),
  ]);

  return { snippets, total };
};

// ============================================================================
// Search Suggestions Queries
// ============================================================================

/**
 * Get search suggestions for a team
 */
export const getSearchSuggestions = (
  prisma: PrismaClient,
  options: {
    teamId: string;
    query: string;
    suggestionType?: string;
    limit?: number;
  }
): Promise<SearchSuggestion[]> => {
  const { teamId, query, suggestionType, limit = 10 } = options;

  const normalizedQuery = query.toLowerCase().trim();

  return prisma.searchSuggestion.findMany({
    where: {
      teamId,
      textNormalized: { startsWith: normalizedQuery },
      ...(suggestionType && { suggestionType }),
    },
    orderBy: [{ score: "desc" }, { usageCount: "desc" }],
    take: limit,
  });
};
