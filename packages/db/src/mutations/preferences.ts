/**
 * Preferences Mutations
 * Mutation functions for user preferences, pinned items, and recent items
 */

import type {
  AnswerCard,
  KnowledgeSnippet,
  PinnedItem,
  Prisma,
  PrismaClient,
  RecentItem,
  SavedSearch,
  SearchSuggestion,
  UserPreferences,
} from "../../prisma/generated/client";

// ============================================================================
// Types
// ============================================================================

export interface UpdatePreferencesInput {
  defaultSearchScope?: string[];
  defaultDocTypes?: string[];
  defaultRankProfile?: string;
  searchResultSize?: number;
  theme?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  emailDigest?: string;
  searchAlerts?: boolean;
  mentionNotifications?: boolean;
  aiEnabled?: boolean;
  showAiAnswers?: boolean;
  aiModel?: string;
  trackHistory?: boolean;
  shareActivity?: boolean;
  hasCompletedOnboarding?: boolean;
  onboardingStep?: number;
  featureFlags?: Record<string, unknown>;
}

export interface CreatePinnedItemInput {
  teamId: string;
  userId: string;
  itemType: string;
  itemId: string;
  title?: string;
  icon?: string;
  url?: string;
  location: string;
  order: number;
}

export interface CreateRecentItemInput {
  teamId: string;
  userId: string;
  itemType: string;
  itemId: string;
  title?: string;
  url?: string;
}

export interface CreateSavedSearchInput {
  teamId: string;
  userId: string;
  name: string;
  description?: string;
  query: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: string;
  rankProfile?: string;
  connectorIds?: string[];
  projectIds?: string[];
  viewMode?: string;
  pageSize?: number;
  visibility?: "PRIVATE" | "TEAM" | "PUBLIC";
  alertEnabled?: boolean;
  alertFrequency?: string;
}

export interface CreateAnswerCardInput {
  teamId: string;
  question: string;
  questionVariants?: string[];
  answer: string;
  answerType?: string;
  dynamicConfig?: Record<string, unknown>;
  sourceDocumentIds?: string[];
  category?: string;
  tags?: string[];
  icon?: string;
  createdBy: string;
}

// ============================================================================
// User Preferences Mutations
// ============================================================================

/**
 * Upsert user preferences
 */
export const upsertUserPreferences = (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    data: UpdatePreferencesInput;
  }
): Promise<UserPreferences> => {
  const { teamId, userId, data } = options;

  return prisma.userPreferences.upsert({
    where: { userId },
    update: data as Prisma.UserPreferencesUpdateInput,
    create: {
      teamId,
      userId,
      ...data,
    } as Prisma.UserPreferencesCreateInput,
  });
};

/**
 * Update onboarding step
 */
export const updateOnboardingStep = (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    step: number;
    totalSteps?: number;
  }
): Promise<UserPreferences> => {
  const { teamId, userId, step, totalSteps = 5 } = options;

  return prisma.userPreferences.upsert({
    where: { userId },
    update: {
      onboardingStep: step,
      hasCompletedOnboarding: step >= totalSteps,
    },
    create: {
      teamId,
      userId,
      onboardingStep: step,
      hasCompletedOnboarding: step >= totalSteps,
    },
  });
};

// ============================================================================
// Pinned Items Mutations
// ============================================================================

/**
 * Create a pinned item
 */
export const createPinnedItem = async (
  prisma: PrismaClient,
  input: CreatePinnedItemInput
): Promise<PinnedItem> =>
  prisma.pinnedItem.create({
    data: input,
  });

/**
 * Delete pinned items
 */
export const deletePinnedItem = async (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    itemType: string;
    itemId: string;
    location: string;
  }
): Promise<{ count: number }> => {
  const { teamId, userId, itemType, itemId, location } = options;

  const result = await prisma.pinnedItem.deleteMany({
    where: {
      teamId,
      userId,
      itemType,
      itemId,
      location,
    },
  });

  return { count: result.count };
};

/**
 * Reorder pinned items
 */
export const reorderPinnedItems = async (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    location: string;
    itemIds: string[];
  }
): Promise<void> => {
  const { teamId, userId, location, itemIds } = options;

  await Promise.all(
    itemIds.map((id, index) =>
      prisma.pinnedItem.updateMany({
        where: {
          id,
          teamId,
          userId,
          location,
        },
        data: { order: index },
      })
    )
  );
};

// ============================================================================
// Recent Items Mutations
// ============================================================================

/**
 * Track a recent item (upsert)
 */
export const trackRecentItem = (
  prisma: PrismaClient,
  input: CreateRecentItemInput
): Promise<RecentItem> => {
  const { teamId, userId, itemType, itemId, title, url } = input;

  return prisma.recentItem.upsert({
    where: {
      teamId_userId_itemType_itemId: {
        teamId,
        userId,
        itemType,
        itemId,
      },
    },
    update: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
      title,
      url,
    },
    create: {
      teamId,
      userId,
      itemType,
      itemId,
      title,
      url,
      accessCount: 1,
      lastAccessedAt: new Date(),
    },
  });
};

/**
 * Clear recent items
 */
export const clearRecentItems = async (
  prisma: PrismaClient,
  options: {
    teamId: string;
    userId: string;
    itemType?: string;
  }
): Promise<{ count: number }> => {
  const { teamId, userId, itemType } = options;

  const result = await prisma.recentItem.deleteMany({
    where: {
      teamId,
      userId,
      ...(itemType && { itemType }),
    },
  });

  return { count: result.count };
};

// ============================================================================
// Saved Searches Mutations
// ============================================================================

/**
 * Create a saved search
 */
export const createSavedSearch = async (
  prisma: PrismaClient,
  input: CreateSavedSearchInput
): Promise<SavedSearch> =>
  prisma.savedSearch.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      name: input.name,
      description: input.description,
      query: input.query,
      filters: input.filters ?? {},
      sortBy: input.sortBy,
      sortOrder: input.sortOrder ?? "relevance",
      rankProfile: input.rankProfile ?? "hybrid",
      connectorIds: input.connectorIds ?? [],
      projectIds: input.projectIds ?? [],
      viewMode: input.viewMode ?? "list",
      pageSize: input.pageSize ?? 20,
      visibility: input.visibility ?? "PRIVATE",
      alertEnabled: input.alertEnabled ?? false,
      alertFrequency: input.alertFrequency,
    },
  });

/**
 * Update a saved search
 */
export const updateSavedSearch = async (
  prisma: PrismaClient,
  options: {
    searchId: string;
    teamId: string;
    userId: string;
    data: Partial<CreateSavedSearchInput>;
  }
): Promise<SavedSearch | null> => {
  const { searchId, teamId, userId, data } = options;

  // Verify ownership
  const existing = await prisma.savedSearch.findFirst({
    where: { id: searchId, teamId, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.savedSearch.update({
    where: { id: searchId },
    data: data as Prisma.SavedSearchUpdateInput,
  });
};

/**
 * Delete a saved search
 */
export const deleteSavedSearch = async (
  prisma: PrismaClient,
  options: {
    searchId: string;
    teamId: string;
    userId: string;
  }
): Promise<boolean> => {
  const { searchId, teamId, userId } = options;

  const result = await prisma.savedSearch.deleteMany({
    where: { id: searchId, teamId, userId },
  });

  return result.count > 0;
};

/**
 * Increment saved search run count
 */
export const incrementSavedSearchRunCount = async (
  prisma: PrismaClient,
  searchId: string
): Promise<void> => {
  await prisma.savedSearch.update({
    where: { id: searchId },
    data: {
      runCount: { increment: 1 },
      lastRunAt: new Date(),
    },
  });
};

/**
 * Toggle saved search pin
 */
export const toggleSavedSearchPin = async (
  prisma: PrismaClient,
  options: {
    searchId: string;
    teamId: string;
    userId: string;
  }
): Promise<SavedSearch | null> => {
  const { searchId, teamId, userId } = options;

  const existing = await prisma.savedSearch.findFirst({
    where: { id: searchId, teamId, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.savedSearch.update({
    where: { id: searchId },
    data: { isPinned: !existing.isPinned },
  });
};

// ============================================================================
// Answer Cards Mutations
// ============================================================================

/**
 * Create an answer card
 */
export const createAnswerCard = async (
  prisma: PrismaClient,
  input: CreateAnswerCardInput
): Promise<AnswerCard> =>
  prisma.answerCard.create({
    data: {
      teamId: input.teamId,
      question: input.question,
      questionVariants: input.questionVariants ?? [],
      answer: input.answer,
      answerType: input.answerType ?? "static",
      dynamicConfig: input.dynamicConfig,
      sourceDocumentIds: input.sourceDocumentIds ?? [],
      category: input.category,
      tags: input.tags ?? [],
      icon: input.icon,
      createdBy: input.createdBy,
    },
  });

/**
 * Update an answer card
 */
export const updateAnswerCard = async (
  prisma: PrismaClient,
  options: {
    cardId: string;
    teamId: string;
    data: Partial<CreateAnswerCardInput>;
  }
): Promise<AnswerCard | null> => {
  const { cardId, teamId, data } = options;

  const existing = await prisma.answerCard.findFirst({
    where: { id: cardId, teamId },
  });

  if (!existing) {
    return null;
  }

  return prisma.answerCard.update({
    where: { id: cardId },
    data: data as Prisma.AnswerCardUpdateInput,
  });
};

/**
 * Delete an answer card
 */
export const deleteAnswerCard = async (
  prisma: PrismaClient,
  options: {
    cardId: string;
    teamId: string;
  }
): Promise<boolean> => {
  const { cardId, teamId } = options;

  const result = await prisma.answerCard.deleteMany({
    where: { id: cardId, teamId },
  });

  return result.count > 0;
};

/**
 * Publish/unpublish an answer card
 */
export const toggleAnswerCardPublish = async (
  prisma: PrismaClient,
  options: {
    cardId: string;
    teamId: string;
  }
): Promise<AnswerCard | null> => {
  const { cardId, teamId } = options;

  const existing = await prisma.answerCard.findFirst({
    where: { id: cardId, teamId },
  });

  if (!existing) {
    return null;
  }

  return prisma.answerCard.update({
    where: { id: cardId },
    data: { isPublished: !existing.isPublished },
  });
};

/**
 * Increment answer card view count
 */
export const incrementAnswerCardViewCount = async (
  prisma: PrismaClient,
  cardId: string
): Promise<void> => {
  await prisma.answerCard.update({
    where: { id: cardId },
    data: { viewCount: { increment: 1 } },
  });
};

/**
 * Mark answer card as helpful/not helpful
 */
export const markAnswerCardHelpful = async (
  prisma: PrismaClient,
  options: {
    cardId: string;
    helpful: boolean;
  }
): Promise<void> => {
  const { cardId, helpful } = options;

  await prisma.answerCard.update({
    where: { id: cardId },
    data: helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } },
  });
};

// ============================================================================
// Knowledge Snippets Mutations
// ============================================================================

/**
 * Create a knowledge snippet
 */
export const createKnowledgeSnippet = async (
  prisma: PrismaClient,
  input: {
    teamId: string;
    sourceDocumentId: string;
    connectorId?: string;
    snippet: string;
    snippetType: string;
    topics?: string[];
    entities?: string[];
    confidence?: number;
  }
): Promise<KnowledgeSnippet> =>
  prisma.knowledgeSnippet.create({
    data: {
      teamId: input.teamId,
      sourceDocumentId: input.sourceDocumentId,
      connectorId: input.connectorId,
      snippet: input.snippet,
      snippetType: input.snippetType,
      topics: input.topics ?? [],
      entities: input.entities ?? [],
      confidence: input.confidence ?? 0,
    },
  });

/**
 * Verify a knowledge snippet
 */
export const verifyKnowledgeSnippet = async (
  prisma: PrismaClient,
  options: {
    snippetId: string;
    teamId: string;
    verifiedBy: string;
  }
): Promise<KnowledgeSnippet | null> => {
  const { snippetId, teamId, verifiedBy } = options;

  const existing = await prisma.knowledgeSnippet.findFirst({
    where: { id: snippetId, teamId },
  });

  if (!existing) {
    return null;
  }

  return prisma.knowledgeSnippet.update({
    where: { id: snippetId },
    data: {
      isVerified: true,
      verifiedBy,
    },
  });
};

// ============================================================================
// Search Suggestions Mutations
// ============================================================================

/**
 * Upsert a search suggestion
 */
export const upsertSearchSuggestion = (
  prisma: PrismaClient,
  input: {
    teamId: string;
    text: string;
    suggestionType: string;
    entityId?: string;
    entityType?: string;
    score?: number;
  }
): Promise<SearchSuggestion> => {
  const normalizedText = input.text.toLowerCase().trim();

  return prisma.searchSuggestion.upsert({
    where: {
      teamId_textNormalized_suggestionType: {
        teamId: input.teamId,
        textNormalized: normalizedText,
        suggestionType: input.suggestionType,
      },
    },
    update: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
      score: input.score,
    },
    create: {
      teamId: input.teamId,
      text: input.text,
      textNormalized: normalizedText,
      suggestionType: input.suggestionType,
      entityId: input.entityId,
      entityType: input.entityType,
      score: input.score ?? 0,
      usageCount: 1,
      lastUsedAt: new Date(),
    },
  });
};
