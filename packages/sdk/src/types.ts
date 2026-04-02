export interface OpenBeamConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
}

// --- MCP Protocol Types ---

export interface McpToolCallRequest {
  jsonrpc: "2.0";
  id: number;
  method: "tools/call";
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface McpToolCallResponse {
  jsonrpc: "2.0";
  id: number;
  result?: {
    content: Array<{ type: string; text: string }>;
    structuredContent?: unknown;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
}

// --- Search Types ---

export interface SearchResult {
  id: string;
  title: string | null;
  snippet: string | null;
  source: string | null;
  connectorType: string | null;
  documentType: string | null;
  sourceName: string | null;
  sourceType: string | null;
  authorName: string | null;
  authorEmail: string | null;
  authorAvatarUrl: string | null;
  url: string | null;
  score: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SearchDocumentsOptions extends RequestOptions {
  limit?: number;
  cursor?: string;
  connectorTypes?: string[];
  documentTypes?: string[];
  authorIds?: string[];
  ranking?: "hybrid" | "semantic" | "bm25" | "recency";
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchDocumentsResponse {
  meta: {
    query: string;
    totalResults: number;
    returned: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    ranking: string;
    queryTimeMs?: number;
    embeddingTimeMs?: number;
    connectorFacets?: Record<string, number>;
  };
  data: SearchResult[];
}

export interface PersonResult {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  department: string | null;
  avatarUrl: string | null;
  connectorType: string | null;
  documentCount?: number;
}

export interface SearchPeopleOptions extends RequestOptions {
  limit?: number;
  connectorTypes?: string[];
}

export interface SearchPeopleResponse {
  data: PersonResult[];
}

export interface RecentResult {
  id: string;
  title: string | null;
  connectorType: string | null;
  documentType: string | null;
  authorName: string | null;
  url: string | null;
  createdAt: string | null;
}

export interface SearchRecentOptions extends RequestOptions {
  hours?: number;
  connectorTypes?: string[];
  limit?: number;
}

export interface SearchRecentResponse {
  meta: {
    hours: number;
    totalResults: number;
    hasNextPage: boolean;
  };
  data: RecentResult[];
}

export interface SearchSemanticOptions extends RequestOptions {
  limit?: number;
  connectorTypes?: string[];
}

export interface SearchSemanticResponse {
  meta: {
    query: string;
    totalResults: number;
    ranking: "semantic";
    hasNextPage: boolean;
  };
  data: SearchResult[];
}

export interface SearchSimilarOptions extends RequestOptions {
  limit?: number;
}

export interface SearchSimilarResponse {
  meta: {
    sourceDocumentId: string;
    totalResults: number;
    hasNextPage: boolean;
  };
  data: SearchResult[];
}

export interface SearchByAuthorOptions extends RequestOptions {
  query?: string;
  limit?: number;
}

export interface SearchByAuthorResponse {
  meta: {
    authorId: string;
    query: string | null;
    totalResults: number;
    hasNextPage: boolean;
  };
  data: SearchResult[];
}

// --- Connector Types ---

export interface Connector {
  id: string;
  name: string | null;
  type: string | null;
  status: string | null;
  lastSyncAt: string | null;
  createdAt?: string | null;
  documentCount: number | null;
}

export interface ConnectorDetail extends Connector {
  config?: Record<string, unknown> | null;
  syncSchedule?: string | null;
  errorMessage?: string | null;
  health?: {
    score: number | null;
    status: string | null;
    lastCheckedAt: string | null;
  } | null;
}

export interface ConnectorHealth {
  connectorId: string;
  status: string;
  score: number | null;
  lastSyncAt: string | null;
  lastSyncDuration?: number | null;
  documentCount: number | null;
  errorCount?: number | null;
  lastError: string | null;
}

export interface ConnectorListOptions extends RequestOptions {
  status?: "active" | "error" | "pending" | "disabled";
  type?: string;
  cursor?: string;
  pageSize?: number;
}

export interface ConnectorListResponse {
  meta: {
    cursor: string | null;
    hasNextPage: boolean;
  };
  data: Connector[];
}

export interface AvailableConnector {
  app: string;
  name: string;
  description: string | null;
  category: string | null;
  authType: string;
  logoUrl: string | null;
  requiredFields?: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
}

export interface ConnectorAvailableOptions extends RequestOptions {
  authType?: "OAUTH" | "API_KEY";
  category?: string;
}

export interface ConnectorAvailableResponse {
  data: AvailableConnector[];
}

// --- Sync Types ---

export interface SyncJob {
  id: string;
  connectorId: string;
  connectorType?: string | null;
  status: string;
  type?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  documentsProcessed?: number | null;
  documentsErrored?: number | null;
  errorMessage?: string | null;
}

export interface SyncTriggerResponse {
  syncJobId: string;
  workflowId: string;
  connectorId: string;
  type: string;
}

export interface SyncStatusResponse {
  connector: Record<string, unknown>;
  latestSync: {
    id: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    durationMs: number | null;
    dataAdded: number | null;
    dataUpdated: number | null;
    dataDeleted: number | null;
    errorMessage: string | null;
  } | null;
  stats: Record<string, unknown>;
  processing: Record<string, unknown>;
  syncJobs: unknown[];
  webhookStatus: unknown;
}

export interface SyncHistoryOptions extends RequestOptions {
  limit?: number;
  offset?: number;
}

export interface SyncHistoryResponse {
  meta: {
    cursor: string | null;
    hasNextPage: boolean;
    total: number;
  };
  data: SyncJob[];
}

export interface SyncTriggerAllResponse {
  type: string;
  triggered: number;
  alreadyRunning: number;
  failed: number;
  total: number;
  connectors: Array<{
    connectorId: string;
    connectorName: string;
    connectorType: string;
    status: string;
    syncJobId?: string;
    workflowId?: string;
    error?: string;
  }>;
}

export interface SyncProgressEntry {
  workflowId: string;
  stage: string;
  processed: number;
  indexed: number;
  errors: number;
  dataAdded: number;
  dataUpdated: number;
  dataDeleted: number;
  batchNumber?: number;
  progressMessage?: string;
  isPaused?: boolean;
}

export interface SyncProgressResponse {
  connectorId: string;
  activeSyncs: SyncProgressEntry[];
}

export interface SyncHealthEntry {
  connectorId: string;
  connectorName: string;
  connectorType: string;
  status: string;
  documentCount: number;
  lastSyncStatus: string | null;
  lastSyncAt: string | null;
}

export interface SyncHealthResponse {
  healthy: number;
  warning: number;
  error: number;
  total: number;
  connectors: SyncHealthEntry[];
}

export interface SyncControlResponse {
  connectorId: string;
  action: string;
  affected: number;
}

export interface SyncErrorEntry {
  connectorId: string;
  connectorType: string | null;
  status: string;
  type: string | null;
  startedAt: string | null;
  errorMessage: string | null;
  documentsProcessed: number | null;
}

export interface SyncErrorsResponse {
  errors: SyncErrorEntry[];
  total: number;
}

// --- Action Types ---

export interface ConnectorAction {
  id: string;
  name: string;
  description: string;
  connectorType: string;
  category: string;
  stakes: string;
  reversible: boolean;
  inputs: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    description: string | null;
  }>;
}

export interface ActionsListOptions extends RequestOptions {
  connectorType?: string;
  category?:
    | "create"
    | "read"
    | "update"
    | "delete"
    | "search"
    | "list"
    | "notify";
}

export interface ActionsListResponse {
  meta: {
    totalActions: number;
    connectorTypes: string[];
    hasNextPage: boolean;
  };
  data: ConnectorAction[];
}

export interface ActionExecuteResponse {
  success: boolean;
  data: unknown;
  error?: string;
}

// --- Team Types ---

export interface Team {
  id: string;
  name: string | null;
  slug: string | null;
  plan: string | null;
  connectorCount: number | null;
  memberCount: number | null;
  documentCount: number | null;
  createdAt: string | null;
}

export interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
}

// --- Knowledge Types ---

export interface KnowledgeEntity {
  id: string;
  name: string | null;
  type: string | null;
  aliases?: string[] | null;
  expertiseScore?: number | null;
  mentionCount?: number | null;
}

export interface KnowledgeRelation {
  id: string;
  relationType: string;
  weight?: number | null;
  fromEntity?: KnowledgeEntity | null;
  toEntity?: KnowledgeEntity | null;
}

export interface EntitySearchOptions extends RequestOptions {
  type?: string;
  limit?: number;
}

export interface EntitySearchResponse {
  data: KnowledgeEntity[];
}

export interface EntityPanelResponse {
  data: {
    entity: KnowledgeEntity;
    relations: {
      outgoing: KnowledgeRelation[];
      incoming: KnowledgeRelation[];
    };
    expertise: Array<{ topic: KnowledgeEntity; score: number | null }>;
    recentMentions: Array<{
      id: string;
      documentId: string | null;
      createdAt: string | null;
    }>;
  };
}

export interface TopicExpertsResponse {
  data: Array<{ person: KnowledgeEntity; score: number | null }>;
}

// --- Agent Types ---

export interface AgentTemplate {
  name: string;
  description: string;
  category: string;
  estimatedDuration: string;
}

export interface AgentRunOptions extends RequestOptions {
  maxSources?: number;
}

export interface AgentRunResponse {
  data: {
    agentName: string;
    output: string;
    stepsUsed: number;
    durationMs: number;
    citations: Array<{ title: string | null; source: string | null }> | null;
  };
}

// --- Context Types ---

export interface ContextEntry {
  uri: string;
  title?: string | null;
  abstract: string | null;
  overview?: string | null;
  contextType: string | null;
  category: string | null;
  score?: number | null;
  updatedAt: string | null;
}

export interface ContextDetail extends ContextEntry {
  content?: string | null;
  parentUri?: string | null;
  ownerType?: string | null;
  activeCount?: number | null;
  relations?: Array<{ targetUri: string; reason: string | null }> | null;
}

export interface ContextSearchOptions extends RequestOptions {
  contextType?: "resource" | "memory" | "skill" | "tool";
  category?: string;
  limit?: number;
}

export interface ContextSearchResponse {
  meta: {
    query: string;
    totalResults: number;
    hasNextPage: boolean;
  };
  data: ContextEntry[];
}

export interface ContextReadOptions extends RequestOptions {
  level?: "0" | "1" | "2";
}

export interface AskQuestionOptions extends RequestOptions {
  connectorTypes?: string[];
  maxSources?: number;
}

export interface AnswerResponse {
  data: {
    answer: string;
    confidence: number | null;
    citations: Array<{
      uri: string | null;
      title: string | null;
      snippet: string | null;
      source: string | null;
    }> | null;
  };
}
