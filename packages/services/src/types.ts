/**
 * Shared Types for @openplane/services
 * Common type definitions used across all services
 */

// ============================================================================
// Document Types
// ============================================================================

export interface DocumentSummary {
  id: string;
  title: string;
  documentType: string;
  connectorType: string;
  connectorId: string;
  url?: string;
  thumbnail?: string;
  snippet?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: number;
  updatedAt?: number;
  accessControl: string[];
  isPublic?: boolean;
  relevanceScore?: number;
}

export interface DocumentDetail extends DocumentSummary {
  content?: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  sourceId?: string;
  sourcePath?: string;
  threadId?: string;
  parentId?: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchFacets {
  connectorTypes: Array<{ value: string; count: number }>;
  documentTypes: Array<{ value: string; count: number }>;
  authors: Array<{ id: string; name: string; count: number }>;
  sources: Array<{ id: string; name: string; count: number }>;
  dates: Array<{ date: string; count: number }>;
}

export interface SearchAggregations {
  totalDocuments: number;
  avgRelevanceScore: number;
  topAuthors: Array<{ id: string; name: string; count: number }>;
  topSources: Array<{ id: string; name: string; count: number }>;
  activityOverTime: Array<{ date: string; count: number }>;
}

export interface AutocompleteSuggestion {
  text: string;
  type: "query" | "document" | "person" | "action";
  entityId?: string;
  icon?: string;
  url?: string;
  score?: number;
}

// ============================================================================
// Person Types
// ============================================================================

export interface PersonSummary {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  title?: string;
  department?: string;
  isBot?: boolean;
  connectorType: string;
}

export interface PersonDetail extends PersonSummary {
  phone?: string;
  location?: string;
  timezone?: string;
  manager?: { id: string; name: string };
  directReports?: Array<{ id: string; name: string }>;
  skills?: string[];
  documentCount?: number;
  lastActiveAt?: number;
}

// ============================================================================
// Collection Types
// ============================================================================

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility: "private" | "team" | "public";
  itemCount: number;
  isPinned: boolean;
  isSmartCollection: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDetail extends CollectionSummary {
  coverImage?: string;
  parentId?: string;
  collaboratorIds?: string[];
  smartRules?: Record<string, unknown>;
  items: CollectionItem[];
}

export interface CollectionItem {
  id: string;
  itemType: "document" | "search" | "link" | "note";
  itemId?: string;
  title?: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  content?: string;
  order: number;
  notes?: string;
  tags: string[];
  addedAt: string;
}

export interface BookmarkSummary {
  id: string;
  documentId: string;
  documentType: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  folder?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ConversationSummary {
  id: string;
  title?: string;
  assistantId?: string;
  assistantName?: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  summary?: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  contentType?: "text" | "markdown" | "code" | "image";
  citations?: Citation[];
  toolCalls?: ToolCall[];
  feedback?: "positive" | "negative";
  createdAt: string;
}

export interface Citation {
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  relevanceScore: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

// ============================================================================
// Assistant Types
// ============================================================================

export interface AssistantSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  visibility: "private" | "team" | "public";
  capabilities: string[];
  usageCount: number;
  createdAt: string;
}

export interface AssistantDetail extends AssistantSummary {
  systemPrompt: string;
  personality?: string;
  instructions?: string;
  connectorIds: string[];
  documentTypes: string[];
  modelConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  examplePrompts: string[];
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// ============================================================================
// Service Context Types
// ============================================================================

export interface ServiceContext {
  teamId: string;
  userId?: string;
  accessControlIds?: string[];
}
