/**
 * @openplane/services
 *
 * Business logic layer that orchestrates @db (Prisma) and @vespa (search).
 * Use this package from both @api (tRPC) and @server (public API).
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │  @api (tRPC)     @server (Hono)                         │
 * │       ↓              ↓                                  │
 * │  ┌───────────────────────────────────────────┐          │
 * │  │         @openplane/services               │          │
 * │  │   (Search, Documents, People, Chat...)    │          │
 * │  └─────────────────┬─────────────────────────┘          │
 * │            ┌───────┴───────┐                            │
 * │            ↓               ↓                            │
 * │     ┌──────────┐    ┌──────────┐                        │
 * │     │  @db     │    │  @vespa  │                        │
 * │     │ (Prisma) │    │ (Search) │                        │
 * │     └──────────┘    └──────────┘                        │
 * └─────────────────────────────────────────────────────────┘
 */

// ============================================================================
// Search Service
// ============================================================================

export * as searchService from "./search";
export {
  type AutocompleteOptions,
  autocomplete,
  type FindSimilarOptions,
  findSimilar,
  getRecentDocuments,
  hybridSearch,
  type RecentDocumentsOptions,
  type SearchByAuthorOptions,
  type SearchParams,
  type SearchResult,
  search,
  searchByAuthor,
  searchThread,
  unifiedSearch,
} from "./search";

// ============================================================================
// Documents Service
// ============================================================================

export * as documentService from "./documents";
export {
  type BulkOperationResult,
  bulkDeleteDocuments,
  type CreateDocumentParams,
  createDocument,
  deleteDocument,
  getDocument,
  hardDeleteDocument,
  type ListDocumentsOptions,
  listDocuments,
  type UpdateDocumentParams,
  updateDocument,
} from "./documents";

// ============================================================================
// People Service
// ============================================================================

export * as peopleService from "./people";
export {
  getOrgChart,
  getPerson,
  getPersonDocuments,
  type ListPeopleOptions,
  listPeople,
  type PersonDocumentsOptions,
  searchPeople,
} from "./people";

// ============================================================================
// Chat Service
// ============================================================================

export * as chatService from "./chat";
export {
  archiveConversationById,
  type CreateConversationParams,
  createConversation,
  deleteConversation,
  getConversation,
  type ListConversationsOptions,
  listConversations,
  type SendMessageParams,
  sendMessage,
  updateTitle,
} from "./chat";

// ============================================================================
// Collections Service
// ============================================================================

export * as collectionsService from "./collections";
export {
  addItem,
  type CreateBookmarkParams,
  type CreateCollectionParams,
  createBookmark,
  createCollection,
  deleteBookmark,
  deleteCollection,
  getBookmarkFolders,
  getCollection,
  type ListBookmarksOptions,
  type ListCollectionsOptions,
  listBookmarks,
  listCollections,
  removeItem,
  reorderItems,
  type UpdateCollectionParams,
  updateBookmark,
  updateCollection,
} from "./collections";

// ============================================================================
// Assistants Service
// ============================================================================

export * as assistantsService from "./assistants";
export {
  type CreateAssistantParams,
  createAssistant,
  deleteAssistant,
  getAssistant,
  incrementUsage,
  type ListAssistantsOptions,
  listAssistants,
  type UpdateAssistantParams,
  updateAssistant,
} from "./assistants";

// ============================================================================
// Actions Service
// ============================================================================

export * as actionsService from "./actions";
export {
  type ActionDetail,
  type ActionExecutionResult,
  type ActionSummary,
  type ExecuteActionParams,
  executeAction,
  getAction,
  getExecutionHistory,
  type ListActionsOptions,
  listActions,
} from "./actions";

// ============================================================================
// Analytics Service
// ============================================================================

export * as analyticsService from "./analytics";
export {
  type DocumentAnalytics,
  getDocumentAnalytics,
  getSearchAnalytics,
  getTeamUsageMetrics,
  getUserAnalytics,
  recordFeedback,
  type SearchAnalytics,
  type TeamUsageMetrics,
  type TrackInteractionParams,
  type TrackSearchParams,
  trackInteraction,
  trackSearch,
  type UserAnalytics,
  updateSearchSession,
} from "./analytics";

// ============================================================================
// Preferences Service (Saved Searches, Answer Cards, etc.)
// ============================================================================

export * as preferencesService from "./preferences";
export {
  type AnswerCardInput,
  createAnswerCardEntry,
  createKnowledgeSnippetEntry,
  createSavedSearchEntry,
  deleteAnswerCardEntry,
  deleteSavedSearchEntry,
  getAnswerCardById,
  getSavedSearchById,
  getSuggestions,
  listAnswerCards,
  listFeaturedSearches,
  listKnowledgeSnippets,
  listSavedSearches,
  markAnswerCardFeedback,
  runSavedSearch,
  type SavedSearchInput,
  toggleAnswerCardPublishStatus,
  toggleSavedSearchPinStatus,
  trackSuggestion,
  updateAnswerCardEntry,
  updateSavedSearchEntry,
  verifyKnowledgeSnippetEntry,
  viewAnswerCard,
} from "./preferences";

// ============================================================================
// Shared Types
// ============================================================================

export * from "./types";
