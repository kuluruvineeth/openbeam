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

export interface ToolServices {
  search: {
    hybrid: (params: SearchParams) => Promise<SearchResponse>;
    semantic: (params: SearchParams) => Promise<SearchResponse>;
    keyword: (params: SearchParams) => Promise<SearchResponse>;
    unified: (params: UnifiedSearchParams) => Promise<UnifiedSearchResponse>;
  };

  rag: {
    answer: (params: RAGParams) => Promise<RAGResponse>;
    analyzeQuery: (query: string) => QueryAnalysis;
    verifyGrounding: (
      response: string,
      documents: Document[]
    ) => GroundingResult;
  };

  documents: {
    get: (id: string) => Promise<Document | null>;
    list: (params: {
      teamId: string;
      limit?: number;
      offset?: number;
      connectorType?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => Promise<{ documents: Document[]; total: number }>;
    getChunks: (documentId: string) => Promise<DocumentChunk[]>;
  };

  connectors: {
    list: (teamId: string) => Promise<Connector[]>;
    get: (id: string) => Promise<Connector | null>;
    getSyncHistory: (
      connectorId: string,
      limit?: number
    ) => Promise<SyncHistoryEntry[]>;
    triggerSync: (params: TriggerSyncParams) => Promise<TriggerSyncResult>;
    getSyncJobStatus: (jobId: string) => Promise<SyncJobStatus | null>;
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
    },
    rag: {
      answer: notImplemented("rag.answer"),
      analyzeQuery: notImplemented("rag.analyzeQuery"),
      verifyGrounding: notImplemented("rag.verifyGrounding"),
    },
    documents: {
      get: notImplemented("documents.get"),
      list: notImplemented("documents.list"),
      getChunks: notImplemented("documents.getChunks"),
    },
    connectors: {
      list: notImplemented("connectors.list"),
      get: notImplemented("connectors.get"),
      getSyncHistory: notImplemented("connectors.getSyncHistory"),
      triggerSync: notImplemented("connectors.triggerSync"),
      getSyncJobStatus: notImplemented("connectors.getSyncJobStatus"),
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
  };
}
