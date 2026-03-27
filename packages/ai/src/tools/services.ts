/**
 * Service Interfaces (Ports)
 *
 * These define the contracts that tools depend on.
 * Actual implementations are injected at runtime by the host application.
 *
 * This follows the Dependency Inversion Principle:
 * - Tools depend on abstractions (these interfaces)
 * - Not on concrete implementations (services package)
 *
 * Benefits:
 * - No circular dependencies (ai doesn't import services)
 * - Testable (can inject mocks)
 * - Decoupled (tools work with any implementation)
 */

export interface SearchResult {
  id: string;
  title: string;
  content?: string;
  url?: string;
  connectorType?: string;
  documentType?: string;
  relevanceScore: number;
  vectorScore?: number;
  bm25Score?: number;
  authorName?: string;
  sourceName?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface SearchParams {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  minScore?: number;
  connectorTypes?: string[];
  accessControlIds?: string[];
}

export interface SearchResponse {
  documents: SearchResult[];
  total: number;
  queryTime: number;
  embeddingTime?: number;
}

export interface RAGParams {
  query: string;
  teamId: string;
  topK?: number;
  maxTokens?: number;
  temperature?: number;
  accessControlIds?: string[];
  includeMedia?: boolean;
}

export interface RAGCitation {
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  connectorType?: string;
  relevanceScore: number;
}

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  context: {
    documentCount: number;
    totalTokens: number;
    truncated: boolean;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface SynthesizeParams {
  question: string;
  chunks: Array<{
    content: string;
    documentId: string;
    documentTitle?: string;
    documentUrl?: string;
    position?: number;
  }>;
  temperature?: number;
  maxOutputTokens?: number;
  instructions?: string;
}

export interface SynthesizeResponse {
  answer: string;
  citations: Array<{
    documentId: string;
    chunkIndex: number;
    snippet: string;
    relevance: number;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface CapabilityInfo {
  connectors: Array<{
    type: string;
    name: string;
    documentCount: number;
    lastSyncAt: Date | null;
    status: string;
  }>;
  tools: Array<{
    name: string;
    category: string;
    description: string;
  }>;
  stats: {
    totalDocuments: number;
    totalConnectors: number;
    activeConnectors: number;
  };
}

export interface Document {
  id: string;
  title: string;
  content?: string;
  url?: string;
  teamId: string;
  connectorType?: string;
  documentType?: string;
  authorName?: string;
  sourceName?: string;
  createdAt?: number;
  updatedAt?: number;
  accessControl?: string[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  position: number;
  tokenCount: number;
}

export interface Connector {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt: Date | null;
  documentCount: number;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface SyncHistoryEntry {
  id: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  documentsProcessed: number;
  errorMessage?: string | null;
}

export interface TriggerSyncParams {
  connectorId: string;
  teamId: string;
  syncType: "full" | "incremental";
  priority: "low" | "normal" | "high";
}

export interface TriggerSyncResult {
  jobId: string;
  connectorId: string;
  syncType: "full" | "incremental";
  queued: boolean;
  queuePosition?: number;
  estimatedStartTime?: Date;
}

export interface SyncJobStatus {
  jobId: string;
  connectorId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress?: {
    documentsProcessed: number;
    documentsTotal?: number;
    percentComplete?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface QueryAnalysis {
  normalizedQuery: string;
  intent: string;
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  searchTerms: string[];
  temporal?: {
    type: string;
    value?: string;
  };
}

export interface GroundingResult {
  isGrounded: boolean;
  overallScore: number;
  confidence: string;
  claims: Array<{
    claim: string;
    supported: boolean;
    confidence: number;
    evidenceSnippet?: string | null;
  }>;
}

export interface VirtualFileInfo {
  fileId: string;
  name: string;
  preview: string;
  tokenCount: number;
}

export interface SpreadsheetColumn {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "unknown";
  nullable: boolean;
  sampleValues?: unknown[];
}

export interface SpreadsheetSchema {
  documentId: string;
  fileName: string;
  sheets: string[];
  activeSheet: string;
  columns: SpreadsheetColumn[];
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

export interface GenerateSqlParams {
  documentId: string;
  naturalLanguageQuery: string;
  schema: SpreadsheetSchema;
}

export interface GenerateSqlResult {
  sql: string;
  explanation: string;
  referencedColumns: string[];
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export interface ExecuteQueryParams {
  documentId: string;
  sql: string;
  viewName: string;
  options?: {
    timeoutMs?: number;
    maxRows?: number;
  };
}

export interface SpreadsheetQueryResult {
  rows: Record<string, unknown>[];
  columnTypes: Record<string, string>;
  rowCount: number;
  totalRowsScanned: number;
  executedSql: string;
  latencyMs: number;
}

export interface UnifiedSearchParams {
  query: string;
  teamId: string;
  limit?: number;
  accessControlIds?: string[];
  connectorTypes?: string[];
  includeDocuments?: boolean;
  includeMedia?: boolean;
}

export interface UnifiedSearchItem {
  id: string;
  type: "document" | "media";
  title: string;
  content?: string;
  url?: string;
  connectorType?: string;
  relevanceScore: number;
  authorName?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface UnifiedSearchResponse {
  items: UnifiedSearchItem[];
  total: number;
  queryTime: number;
  embeddingTime?: number;
}

export interface PauseResumeResult {
  connectorId: string;
  previousStatus: string;
  newStatus: string;
  message: string;
}

export interface SyncHistoryPage {
  entries: SyncHistoryEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ExportResult {
  fileId: string;
  fileName: string;
  format: "json" | "csv" | "markdown";
  size: number;
  downloadUrl?: string;
}

export interface ShareResult {
  shareId: string;
  shareUrl: string;
  expiresAt?: Date;
}

export interface StorageObject {
  key: string;
  lastModified?: Date;
  size?: number;
}

export interface StorageListResult {
  objects: StorageObject[];
  nextCursor?: string;
  commonPrefixes?: string[];
}

export interface MediaSearchResult {
  videoId: string;
  score: number;
  startSec: number;
  endSec: number;
  confidence: string;
  thumbnailUrl?: string;
}

export interface MediaTranscriptSegment {
  start: number;
  end: number;
  value: string;
}

export interface MediaChapter {
  title: string;
  start: number;
  end: number;
}

export interface MediaHighlight {
  description: string;
  start: number;
  end: number;
}

export interface MediaMetadata {
  summary: string;
  keywords: string[];
  duration: number;
  thumbnailUrl?: string;
  chapters: MediaChapter[];
  highlights: MediaHighlight[];
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string | null;
  category: string;
  nodes: unknown;
  edges: unknown;
  settings: unknown;
  requiredConnectors: string[];
  isPublic: boolean;
  teamId: string | null;
  usageCount: number;
}

export interface IntegrationInfo {
  type: string;
  name: string;
  category: string;
  authType: "oauth" | "api_key" | "service_account";
  capabilities: string[];
  documentTypes: string[];
}

export interface UserPreferences {
  preferredSources: string[];
  excludedSources: string[];
  defaultSearchLimit: number;
  dateRangeDefault?: "day" | "week" | "month" | "year" | "all";
  resultDisplayMode: "compact" | "detailed";
}

export interface WorkspaceField {
  name: string;
  type: string;
  required: boolean;
}

export interface WorkspaceObjectSchema {
  name: string;
  description?: string;
  fields: WorkspaceField[];
  entryCount: number;
  sampleData: Record<string, unknown>[];
}

export interface WorkspaceSchema {
  teamId: string;
  objects: WorkspaceObjectSchema[];
}

export interface GenerateWorkspaceSqlParams {
  teamId: string;
  question: string;
  schema: WorkspaceSchema;
}

export interface GenerateWorkspaceSqlResult {
  sql: string;
  explanation: string;
  referencedColumns: string[];
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export interface SandboxCodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  logs: string[];
  artifacts: Array<{
    type: "file" | "image" | "chart";
    path: string;
    mimeType?: string;
  }>;
  durationMs: number;
}

export interface SandboxProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ContextDbEntry {
  uri: string;
  parentUri: string | null;
  contextType: string;
  category: string | null;
  isLeaf: boolean;
  abstract: string;
  overview: string | null;
  content: string | null;
  activeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContextDbSearchResult {
  entries: Array<{
    uri: string;
    abstract: string;
    contextType: string;
    category: string | null;
    relevanceScore: number;
    activeCount: number;
  }>;
  total: number;
  queryTime: number;
}

export interface ContextDbStoreResult {
  id: string;
  uri: string;
  abstract: string;
  stored: boolean;
}

export interface ContextDbBrowseResult {
  uri: string;
  children: Array<{
    uri: string;
    abstract: string;
    contextType: string;
    isLeaf: boolean;
    activeCount: number;
  }>;
  total: number;
}

export interface ToolServices {
  search: {
    hybrid: (params: SearchParams) => Promise<SearchResponse>;
    semantic: (params: SearchParams) => Promise<SearchResponse>;
    keyword: (params: SearchParams) => Promise<SearchResponse>;
    unified: (params: UnifiedSearchParams) => Promise<UnifiedSearchResponse>;
    export: (params: {
      teamId: string;
      query: string;
      format: "json" | "csv" | "markdown";
      limit?: number;
    }) => Promise<ExportResult>;
    save: (params: {
      teamId: string;
      userId: string;
      name: string;
      query: string;
      filters?: Record<string, unknown>;
    }) => Promise<{ savedSearchId: string; name: string }>;
  };

  rag: {
    answer: (params: RAGParams) => Promise<RAGResponse>;
    synthesize: (params: SynthesizeParams) => Promise<SynthesizeResponse>;
    analyzeQuery: (query: string) => QueryAnalysis;
    verifyGrounding: (
      response: string,
      documents: Document[]
    ) => GroundingResult;
  };

  discovery: {
    getCapabilities: (teamId: string) => Promise<CapabilityInfo>;
  };

  documents: {
    get: (id: string) => Promise<Document | null>;
    list: (params: {
      teamId: string;
      limit?: number;
      offset?: number;
      connectorId?: string;
      connectorType?: string;
      query?: string;
      dateFrom?: Date;
      dateTo?: Date;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => Promise<{ documents: Document[]; total: number }>;
    getChunks: (documentId: string) => Promise<DocumentChunk[]>;
    export: (params: {
      documentId: string;
      teamId: string;
      format: "json" | "markdown" | "text";
    }) => Promise<ExportResult>;
    share: (params: {
      documentId: string;
      teamId: string;
      userId: string;
      expiresInHours?: number;
    }) => Promise<ShareResult>;
  };

  connectors: {
    list: (teamId: string) => Promise<Connector[]>;
    get: (id: string) => Promise<Connector | null>;
    getSyncHistory: (
      connectorId: string,
      limit?: number
    ) => Promise<SyncHistoryEntry[]>;
    getSyncHistoryPaginated: (params: {
      connectorId: string;
      limit?: number;
      offset?: number;
    }) => Promise<SyncHistoryPage>;
    triggerSync: (params: TriggerSyncParams) => Promise<TriggerSyncResult>;
    getSyncJobStatus: (jobId: string) => Promise<SyncJobStatus | null>;
    pause: (connectorId: string, teamId: string) => Promise<PauseResumeResult>;
    resume: (connectorId: string, teamId: string) => Promise<PauseResumeResult>;
  };

  preferences: {
    get: (userId: string, teamId: string) => Promise<UserPreferences>;
    update: (
      userId: string,
      teamId: string,
      preferences: Partial<UserPreferences>
    ) => Promise<UserPreferences>;
  };

  context: {
    storeVirtualFile: (
      name: string,
      content: string,
      mimeType?: string
    ) => VirtualFileInfo;
    retrieveVirtualFile: (fileId: string) => string | null;
    retrieveVirtualFileChunk: (
      fileId: string,
      start: number,
      end: number
    ) => string | null;
    listVirtualFiles: () => VirtualFileInfo[];
    deleteVirtualFile: (fileId: string) => boolean;
  };

  analytics: {
    getSpreadsheetSchema: (
      documentId: string,
      teamId: string
    ) => Promise<SpreadsheetSchema>;
    generateSql: (params: GenerateSqlParams) => Promise<GenerateSqlResult>;
    executeQuery: (
      params: ExecuteQueryParams
    ) => Promise<SpreadsheetQueryResult>;
  };

  storage: {
    list: (params: {
      teamId: string;
      prefix?: string;
      limit?: number;
      cursor?: string;
    }) => Promise<StorageListResult>;
    getSignedUrl: (params: {
      teamId: string;
      key: string;
      expiresIn?: number;
    }) => Promise<string>;
    exists: (params: { teamId: string; key: string }) => Promise<boolean>;
    getMetadata: (params: {
      teamId: string;
      key: string;
    }) => Promise<StorageObject | null>;
  };

  media: {
    searchByText: (params: {
      teamId: string;
      indexId: string;
      query: string;
      limit?: number;
    }) => Promise<MediaSearchResult[]>;
    searchByImage: (params: {
      teamId: string;
      indexId: string;
      imageUrl: string;
      limit?: number;
    }) => Promise<MediaSearchResult[]>;
    getTranscript: (params: {
      teamId: string;
      indexId: string;
      videoId: string;
    }) => Promise<string | null>;
    getTranscriptWithTimestamps: (params: {
      teamId: string;
      indexId: string;
      videoId: string;
    }) => Promise<MediaTranscriptSegment[]>;
    getMetadata: (params: {
      teamId: string;
      indexId: string;
      videoId: string;
    }) => Promise<MediaMetadata>;
    analyze: (params: {
      teamId: string;
      videoId: string;
      prompt: string;
    }) => Promise<string>;
    getSummary: (params: {
      teamId: string;
      videoId: string;
      prompt?: string;
    }) => Promise<string>;
    getChapters: (params: {
      teamId: string;
      videoId: string;
    }) => Promise<MediaChapter[]>;
    getHighlights: (params: {
      teamId: string;
      videoId: string;
    }) => Promise<MediaHighlight[]>;
  };

  integrations: {
    listAvailable: () => Promise<IntegrationInfo[]>;
    getCapabilities: (
      integrationType: string
    ) => Promise<IntegrationInfo | null>;
  };

  templates?: {
    list: (params: {
      teamId?: string;
      category?: string;
      isPublic?: boolean;
      limit?: number;
    }) => Promise<TemplateInfo[]>;
    get: (id: string) => Promise<TemplateInfo | null>;
  };

  sandbox?: {
    executeCode: (
      code: string,
      language?: "python" | "javascript" | "bash"
    ) => Promise<SandboxCodeExecutionResult>;
    runCommand: (
      command: string,
      opts?: { cwd?: string; env?: Record<string, string> }
    ) => Promise<SandboxProcessResult>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    listFiles: (
      path: string
    ) => Promise<
      Array<{ path: string; name: string; isDirectory: boolean; size: number }>
    >;
  };

  workspace: {
    getSchema: (teamId: string) => Promise<WorkspaceSchema>;
    generateSql: (
      params: GenerateWorkspaceSqlParams
    ) => Promise<GenerateWorkspaceSqlResult>;
  };

  controlAgents?: {
    list: (params: { teamId: string; limit?: number }) => Promise<unknown[]>;
    get: (params: {
      teamId: string;
      agentId: string;
    }) => Promise<unknown | null>;
    wake: (params: {
      teamId: string;
      agentId: string;
      reason: string;
      payload?: Record<string, unknown>;
    }) => Promise<{ requestId: string; accepted: boolean }>;
  };

  controlIssues?: {
    list: (params: {
      teamId: string;
      limit?: number;
      status?: string;
    }) => Promise<unknown[]>;
    create: (params: {
      teamId: string;
      title: string;
      priority?: string;
      [key: string]: unknown;
    }) => Promise<{ id: string; title: string }>;
    update: (params: {
      teamId: string;
      issueId: string;
      [key: string]: unknown;
    }) => Promise<unknown | null>;
    comment: (params: {
      teamId: string;
      issueId: string;
      body: string;
    }) => Promise<{ id: string; body: string }>;
    checkout: (params: {
      teamId: string;
      issueId: string;
      agentId?: string;
    }) => Promise<{ success: boolean }>;
  };

  controlApprovals?: {
    list: (params: { teamId: string; status?: string }) => Promise<unknown[]>;
    request: (params: {
      teamId: string;
      action: string;
      reason: string;
      metadata?: Record<string, unknown>;
      expiresInMinutes?: number;
    }) => Promise<{ id: string; status: string }>;
    respond: (params: {
      teamId: string;
      approvalId: string;
      approved: boolean;
      reason?: string;
    }) => Promise<{ id: string; status: string } | null>;
  };

  controlCosts?: {
    record: (params: {
      teamId: string;
      agentId: string;
      provider: string;
      costCents: number;
      [key: string]: unknown;
    }) => Promise<{ id: string; costCents: number }>;
    query: (params: {
      teamId: string;
      periodDays?: number;
      agentId?: string;
    }) => Promise<{ totalCents: number; entries: unknown[] }>;
  };

  controlGoals?: {
    list: (params: { teamId: string }) => Promise<unknown[]>;
    get: (params: {
      teamId: string;
      goalId: string;
    }) => Promise<unknown | null>;
  };

  controlProjects?: {
    list: (params: { teamId: string; limit?: number }) => Promise<unknown[]>;
  };

  controlMemory?: {
    read: (params: {
      teamId: string;
      agentId?: string;
      category: string;
      name: string;
    }) => Promise<string | null>;
    write: (params: {
      teamId: string;
      agentId?: string;
      category: string;
      name: string;
      content: string;
      append?: boolean;
    }) => Promise<void>;
  };

  controlKnowledge?: {
    query: (params: {
      teamId: string;
      path?: string;
    }) => Promise<{ content: string | null; files?: string[] }>;
    store: (params: {
      teamId: string;
      path: string;
      content: string;
      append?: boolean;
      authorAgentId?: string;
    }) => Promise<void>;
  };

  controlArtifacts?: {
    create: (params: {
      teamId: string;
      agentId?: string;
      title: string;
      contentType: string;
      content: string;
      issueId?: string;
      projectId?: string;
      metadata?: Record<string, unknown>;
    }) => Promise<{ id: string; title: string; url: string }>;
  };

  controlProgress?: {
    evaluate: (params: {
      teamId: string;
      agentId?: string;
      issueId?: string;
      completionPercent: number;
      summary: string;
      remainingWork?: string[];
      blockers?: string[];
      confidence?: string;
    }) => Promise<unknown>;
    replan: (params: {
      teamId: string;
      agentId?: string;
      issueId?: string;
      currentPlan: string;
      reason: string;
      proposedPlan: string;
      estimatedImpact?: string;
    }) => Promise<unknown>;
  };

  contextDb?: {
    search: (params: {
      query: string;
      teamId: string;
      scope?: string;
      contextType?: string;
      limit?: number;
    }) => Promise<ContextDbSearchResult>;
    read: (params: {
      uri: string;
      teamId: string;
      level: "L0" | "L1" | "L2";
    }) => Promise<ContextDbEntry | null>;
    store: (params: {
      teamId: string;
      ownerId: string;
      ownerType: "user" | "agent" | "team";
      content: string;
      contextType: string;
      category?: string;
      uri?: string;
    }) => Promise<ContextDbStoreResult>;
    browse: (params: {
      uri: string;
      teamId: string;
    }) => Promise<ContextDbBrowseResult>;
    relate: (params: {
      teamId: string;
      sourceUri: string;
      targetUri: string;
      reason?: string;
    }) => Promise<{ id: string; created: boolean }>;
  };

  voice?: {
    startDictation: (params: {
      userId: string;
      teamId: string;
      targetField?: string;
      language?: string;
      formatting?: boolean;
    }) => Promise<{ id: string; roomName: string }>;
    startAction: (params: {
      userId: string;
      teamId: string;
      initialQuery?: string;
      conversational?: boolean;
    }) => Promise<{ id: string; roomName: string }>;
    createNote: (params: {
      userId: string;
      teamId: string;
      title: string;
      content: string;
      durationSeconds?: number;
    }) => Promise<{ id: string; title: string; createdAt: Date }>;
    listNotes: (params: {
      userId: string;
      teamId: string;
      limit?: number;
    }) => Promise<Array<{ id: string; title: string; createdAt: Date }>>;
    getNote: (params: { noteId: string; userId: string }) => Promise<{
      id: string;
      title: string;
      content: string;
      createdAt: Date;
    } | null>;
  };
}

export function createUnimplementedServices(): ToolServices {
  const notImplemented = (name: string) => () => {
    throw new Error(
      `Service "${name}" not implemented. ` +
        "Bind services using toolRegistry.bindServices() before executing tools."
    );
  };

  return {
    search: {
      hybrid: notImplemented("search.hybrid"),
      semantic: notImplemented("search.semantic"),
      keyword: notImplemented("search.keyword"),
      unified: notImplemented("search.unified"),
      export: notImplemented("search.export"),
      save: notImplemented("search.save"),
    },
    rag: {
      answer: notImplemented("rag.answer"),
      synthesize: notImplemented("rag.synthesize"),
      analyzeQuery: notImplemented("rag.analyzeQuery"),
      verifyGrounding: notImplemented("rag.verifyGrounding"),
    },
    discovery: {
      getCapabilities: notImplemented("discovery.getCapabilities"),
    },
    documents: {
      get: notImplemented("documents.get"),
      list: notImplemented("documents.list"),
      getChunks: notImplemented("documents.getChunks"),
      export: notImplemented("documents.export"),
      share: notImplemented("documents.share"),
    },
    connectors: {
      list: notImplemented("connectors.list"),
      get: notImplemented("connectors.get"),
      getSyncHistory: notImplemented("connectors.getSyncHistory"),
      getSyncHistoryPaginated: notImplemented(
        "connectors.getSyncHistoryPaginated"
      ),
      triggerSync: notImplemented("connectors.triggerSync"),
      getSyncJobStatus: notImplemented("connectors.getSyncJobStatus"),
      pause: notImplemented("connectors.pause"),
      resume: notImplemented("connectors.resume"),
    },
    preferences: {
      get: notImplemented("preferences.get"),
      update: notImplemented("preferences.update"),
    },
    context: {
      storeVirtualFile: notImplemented("context.storeVirtualFile"),
      retrieveVirtualFile: notImplemented("context.retrieveVirtualFile"),
      retrieveVirtualFileChunk: notImplemented(
        "context.retrieveVirtualFileChunk"
      ),
      listVirtualFiles: notImplemented("context.listVirtualFiles"),
      deleteVirtualFile: notImplemented("context.deleteVirtualFile"),
    },
    analytics: {
      getSpreadsheetSchema: notImplemented("analytics.getSpreadsheetSchema"),
      generateSql: notImplemented("analytics.generateSql"),
      executeQuery: notImplemented("analytics.executeQuery"),
    },
    storage: {
      list: notImplemented("storage.list"),
      getSignedUrl: notImplemented("storage.getSignedUrl"),
      exists: notImplemented("storage.exists"),
      getMetadata: notImplemented("storage.getMetadata"),
    },
    media: {
      searchByText: notImplemented("media.searchByText"),
      searchByImage: notImplemented("media.searchByImage"),
      getTranscript: notImplemented("media.getTranscript"),
      getTranscriptWithTimestamps: notImplemented(
        "media.getTranscriptWithTimestamps"
      ),
      getMetadata: notImplemented("media.getMetadata"),
      analyze: notImplemented("media.analyze"),
      getSummary: notImplemented("media.getSummary"),
      getChapters: notImplemented("media.getChapters"),
      getHighlights: notImplemented("media.getHighlights"),
    },
    integrations: {
      listAvailable: notImplemented("integrations.listAvailable"),
      getCapabilities: notImplemented("integrations.getCapabilities"),
    },
    workspace: {
      getSchema: notImplemented("workspace.getSchema"),
      generateSql: notImplemented("workspace.generateSql"),
    },
    contextDb: {
      search: notImplemented("contextDb.search"),
      read: notImplemented("contextDb.read"),
      store: notImplemented("contextDb.store"),
      browse: notImplemented("contextDb.browse"),
      relate: notImplemented("contextDb.relate"),
    },
  } satisfies ToolServices;
}
