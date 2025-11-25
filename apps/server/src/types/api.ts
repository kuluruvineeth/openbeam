/**
 * API Types - Core type definitions for the public API
 * These types ensure consistency across all API endpoints
 */

import type { Context } from "hono";
import type { AuthEnv } from "@/middleware/auth";

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Standard API response envelope
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: ResponseMeta;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  meta?: ResponseMeta;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  processingTimeMs: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================================================
// Common Query Parameters
// ============================================================================

/**
 * Standard pagination params
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

/**
 * Standard sorting params
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Standard date range params
 */
export interface DateRangeParams {
  fromDate?: number;
  toDate?: number;
}

/**
 * Standard filter params
 */
export interface FilterParams {
  connectorId?: string;
  connectorType?: string;
  documentType?: string;
  authorId?: string;
  sourceId?: string;
}

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
  isPublic: boolean;
  relevanceScore?: number;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
  contentType: string;
  rawContent?: string;
  metadata?: Record<string, unknown>;
  attachments?: DocumentAttachment[];
  reactions?: DocumentReaction[];
  threadId?: string;
  parentId?: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface DocumentReaction {
  emoji: string;
  count: number;
  users?: string[];
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
  connectorType: string;
  connectorId: string;
  isBot?: boolean;
  documentCount?: number;
}

export interface PersonDetail extends PersonSummary {
  bio?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  manager?: PersonSummary;
  directReports?: PersonSummary[];
  skills?: string[];
  teams?: string[];
  recentDocuments?: DocumentSummary[];
  activityScore?: number;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  ranking?: SearchRanking;
  pagination?: PaginationParams;
  options?: SearchOptions;
}

export interface SearchFilters {
  connectorTypes?: string[];
  connectorIds?: string[];
  documentTypes?: string[];
  authorIds?: string[];
  sourceIds?: string[];
  fromDate?: number;
  toDate?: number;
  tags?: string[];
  isPublic?: boolean;
}

export type SearchRanking =
  | "hybrid"
  | "bm25"
  | "semantic"
  | "recency"
  | "engagement";

export interface SearchOptions {
  includeSnippets?: boolean;
  snippetLength?: number;
  highlightMatches?: boolean;
  includeFacets?: boolean;
  includeAggregations?: boolean;
  groupByThread?: boolean;
}

export interface SearchResult {
  documents: DocumentSummary[];
  total: number;
  query: string;
  ranking: SearchRanking;
  facets?: SearchFacets;
  aggregations?: SearchAggregations;
  suggestions?: string[];
  queryTime: number;
}

export interface SearchFacets {
  connectorTypes: FacetValue[];
  documentTypes: FacetValue[];
  authors: FacetValue[];
  sources: FacetValue[];
  dates: DateFacet[];
}

export interface FacetValue {
  value: string;
  label?: string;
  count: number;
}

export interface DateFacet {
  period: string;
  count: number;
  from: number;
  to: number;
}

export interface SearchAggregations {
  totalDocuments: number;
  avgRelevanceScore: number;
  topAuthors: Array<{ id: string; name: string; count: number }>;
  topSources: Array<{ id: string; name: string; count: number }>;
  activityOverTime: Array<{ date: string; count: number }>;
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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CollectionDetail extends CollectionSummary {
  items: CollectionItem[];
  coverImage?: string;
  collaborators?: string[];
  isSmartCollection: boolean;
  smartRules?: Record<string, unknown>;
}

export interface CollectionItem {
  id: string;
  type: "document" | "search" | "link" | "note";
  documentId?: string;
  document?: DocumentSummary;
  url?: string;
  title?: string;
  description?: string;
  notes?: string;
  order: number;
  addedAt: string;
  addedBy: string;
}

// ============================================================================
// Assistant/Chat Types
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
}

export interface AssistantDetail extends AssistantSummary {
  systemPrompt: string;
  personality?: string;
  instructions?: string;
  connectorIds: string[];
  documentTypes: string[];
  modelConfig: ModelConfig;
  examplePrompts: string[];
}

export interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

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
  messages: ChatMessage[];
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  contentType: "text" | "markdown" | "code";
  citations?: Citation[];
  toolCalls?: ToolCall[];
  feedback?: "positive" | "negative" | null;
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
  toolId: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface UsageAnalytics {
  period: string;
  searchQueries: number;
  uniqueUsers: number;
  documentsIndexed: number;
  aiInteractions: number;
  apiCalls: number;
}

export interface SearchAnalytics {
  topQueries: Array<{ query: string; count: number; avgResults: number }>;
  failedQueries: Array<{ query: string; count: number }>;
  avgResponseTime: number;
  clickThroughRate: number;
}

export interface ConnectorAnalytics {
  connectorId: string;
  connectorType: string;
  documentsIndexed: number;
  lastSyncAt?: string;
  syncStatus: string;
  healthScore: number;
}

// ============================================================================
// API Key Types
// ============================================================================

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  type: "standard" | "restricted" | "admin" | "service" | "webhook" | "embed";
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export interface ApiKeyDetail extends ApiKeySummary {
  description?: string;
  allowedIps: string[];
  allowedDomains: string[];
  rateLimit: RateLimitConfig;
  usageCount: number;
}

export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

// ============================================================================
// Context Extensions
// ============================================================================

export type ApiContext = Context<AuthEnv>;

export interface RequestContext {
  teamId: string;
  userId?: string;
  accessControlIds: string[];
  scopes: string[];
  requestId: string;
  startTime: number;
}
