/**
 * Preferences Service
 * Business logic for saved searches, answer cards, and knowledge snippets
 */

import prisma, {
  createAnswerCard,
  createKnowledgeSnippet,
  createSavedSearch,
  deleteAnswerCard,
  deleteSavedSearch,
  getAnswerCard,
  getAnswerCards,
  getFeaturedSearches,
  getKnowledgeSnippets,
  getSavedSearch,
  getSavedSearches,
  getSearchSuggestions,
  incrementAnswerCardViewCount,
  incrementSavedSearchRunCount,
  markAnswerCardHelpful,
  toggleAnswerCardPublish,
  toggleSavedSearchPin,
  updateAnswerCard,
  updateSavedSearch,
  upsertSearchSuggestion,
  verifyKnowledgeSnippet,
} from "@openplane/db";

// ============================================================================
// Types
// ============================================================================

export interface SavedSearchInput {
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

export interface AnswerCardInput {
  question: string;
  questionVariants?: string[];
  answer: string;
  answerType?: string;
  dynamicConfig?: Record<string, unknown>;
  sourceDocumentIds?: string[];
  category?: string;
  tags?: string[];
  icon?: string;
}

// ============================================================================
// Saved Searches
// ============================================================================

/**
 * List saved searches for a user
 */
export async function listSavedSearches(
  teamId: string,
  userId: string,
  options: {
    visibility?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  return await getSavedSearches(prisma, {
    teamId,
    userId,
    visibility: options.visibility,
    limit: options.limit,
    offset: options.offset,
  });
}

/**
 * Get a single saved search
 */
export async function getSavedSearchById(searchId: string, teamId: string) {
  return await getSavedSearch(prisma, searchId, teamId);
}

/**
 * Create a saved search
 */
export async function createSavedSearchEntry(
  teamId: string,
  userId: string,
  input: SavedSearchInput
) {
  return await createSavedSearch(prisma, {
    teamId,
    userId,
    ...input,
  });
}

/**
 * Update a saved search
 */
export async function updateSavedSearchEntry(
  searchId: string,
  teamId: string,
  userId: string,
  data: Partial<SavedSearchInput>
) {
  return await updateSavedSearch(prisma, {
    searchId,
    teamId,
    userId,
    data,
  });
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearchEntry(
  searchId: string,
  teamId: string,
  userId: string
) {
  return await deleteSavedSearch(prisma, {
    searchId,
    teamId,
    userId,
  });
}

/**
 * Run a saved search (increment count)
 */
export async function runSavedSearch(searchId: string) {
  await incrementSavedSearchRunCount(prisma, searchId);
}

/**
 * Toggle saved search pin
 */
export async function toggleSavedSearchPinStatus(
  searchId: string,
  teamId: string,
  userId: string
) {
  return await toggleSavedSearchPin(prisma, {
    searchId,
    teamId,
    userId,
  });
}

/**
 * Get featured saved searches for a team
 */
export async function listFeaturedSearches(teamId: string, limit = 10) {
  return await getFeaturedSearches(prisma, teamId, limit);
}

// ============================================================================
// Answer Cards
// ============================================================================

/**
 * List answer cards
 */
export async function listAnswerCards(
  teamId: string,
  options: {
    category?: string;
    isPublished?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  return await getAnswerCards(prisma, {
    teamId,
    ...options,
  });
}

/**
 * Get a single answer card
 */
export async function getAnswerCardById(cardId: string, teamId: string) {
  return await getAnswerCard(prisma, cardId, teamId);
}

/**
 * Create an answer card
 */
export async function createAnswerCardEntry(
  teamId: string,
  createdBy: string,
  input: AnswerCardInput
) {
  return await createAnswerCard(prisma, {
    teamId,
    createdBy,
    ...input,
  });
}

/**
 * Update an answer card
 */
export async function updateAnswerCardEntry(
  cardId: string,
  teamId: string,
  data: Partial<AnswerCardInput>
) {
  return await updateAnswerCard(prisma, {
    cardId,
    teamId,
    data,
  });
}

/**
 * Delete an answer card
 */
export async function deleteAnswerCardEntry(cardId: string, teamId: string) {
  return await deleteAnswerCard(prisma, {
    cardId,
    teamId,
  });
}

/**
 * Toggle answer card publish status
 */
export async function toggleAnswerCardPublishStatus(
  cardId: string,
  teamId: string
) {
  return await toggleAnswerCardPublish(prisma, {
    cardId,
    teamId,
  });
}

/**
 * View an answer card (increment count)
 */
export async function viewAnswerCard(cardId: string) {
  await incrementAnswerCardViewCount(prisma, cardId);
}

/**
 * Mark answer card helpful/not helpful
 */
export async function markAnswerCardFeedback(cardId: string, helpful: boolean) {
  await markAnswerCardHelpful(prisma, {
    cardId,
    helpful,
  });
}

// ============================================================================
// Knowledge Snippets
// ============================================================================

/**
 * List knowledge snippets
 */
export async function listKnowledgeSnippets(
  teamId: string,
  options: {
    snippetType?: string;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  return await getKnowledgeSnippets(prisma, {
    teamId,
    ...options,
  });
}

/**
 * Create a knowledge snippet
 */
export async function createKnowledgeSnippetEntry(
  teamId: string,
  input: {
    sourceDocumentId: string;
    connectorId?: string;
    snippet: string;
    snippetType: string;
    topics?: string[];
    entities?: string[];
    confidence?: number;
  }
) {
  return await createKnowledgeSnippet(prisma, {
    teamId,
    ...input,
  });
}

/**
 * Verify a knowledge snippet
 */
export async function verifyKnowledgeSnippetEntry(
  snippetId: string,
  teamId: string,
  verifiedBy: string
) {
  return await verifyKnowledgeSnippet(prisma, {
    snippetId,
    teamId,
    verifiedBy,
  });
}

// ============================================================================
// Search Suggestions
// ============================================================================

/**
 * Get search suggestions
 */
export async function getSuggestions(
  teamId: string,
  query: string,
  options: {
    suggestionType?: string;
    limit?: number;
  } = {}
) {
  return await getSearchSuggestions(prisma, {
    teamId,
    query,
    ...options,
  });
}

/**
 * Track a search suggestion
 */
export async function trackSuggestion(
  teamId: string,
  text: string,
  suggestionType: string,
  options: {
    entityId?: string;
    entityType?: string;
    score?: number;
  } = {}
) {
  return await upsertSearchSuggestion(prisma, {
    teamId,
    text,
    suggestionType,
    ...options,
  });
}
