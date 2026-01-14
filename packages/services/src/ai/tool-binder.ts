import type {
  Connector,
  ContextOrchestrator,
  Document,
  DocumentChunk,
  ExecuteQueryParams,
  GenerateSqlParams,
  GenerateSqlResult,
  GroundingResult,
  QueryAnalysis,
  RAGParams,
  RAGResponse,
  SearchParams,
  SearchResponse,
  SearchResult,
  SpreadsheetQueryResult,
  SpreadsheetSchema,
  SyncHistoryEntry,
  ToolServices,
  UnifiedSearchParams,
  UnifiedSearchResponse,
  VirtualFileInfo,
} from "@openplane/ai";
import { CompletionService } from "@openplane/ai";
import {
  type AnalyticsService,
  createAnalyticsService,
} from "@openplane/analytics";
import prisma, {
  createSavedSearch,
  createShareLink,
  findConnectorById,
  findUserSearchProfile,
  listConnectorsByTeam,
  triggerSync,
  upsertUserProfilePreferences,
} from "@openplane/db";
import { addSyncJob, getSyncJob, type SyncJobData } from "@openplane/redis";
import { escapeYqlString, vespaClient } from "@openplane/vespa";
import { searchService } from "../search";
import { getStorageProvider } from "../storage";
import { hybridSearch, keywordSearch, semanticSearch } from "./hybrid-search";
import { ragAnswer } from "./rag";
import { analyzeQuery, verifyGrounding } from "./rag/index";
import type { RAGChunk } from "./rag/types";

function adaptSearchResult(doc: {
  id: string;
  title: string;
  content?: string | null;
  url?: string | null;
  connector_type?: string | null;
  document_type?: string | null;
  relevanceScore?: number;
  vectorScore?: number;
  bm25Score?: number;
  author_name?: string | null;
  source_name?: string | null;
  created_at?: number | string | null;
  updated_at?: number | string | null;
}): SearchResult {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content ?? undefined,
    url: doc.url ?? undefined,
    connectorType: doc.connector_type ?? undefined,
    documentType: doc.document_type ?? undefined,
    relevanceScore: doc.relevanceScore ?? 0,
    vectorScore: doc.vectorScore ?? undefined,
    bm25Score: doc.bm25Score ?? undefined,
    authorName: doc.author_name ?? undefined,
    sourceName: doc.source_name ?? undefined,
    createdAt: doc.created_at ? Number(doc.created_at) : undefined,
    updatedAt: doc.updated_at ? Number(doc.updated_at) : undefined,
  };
}

function adaptDocument(doc: {
  id: string;
  title: string;
  content?: string | null;
  url?: string | null;
  team_id: string;
  connector_type?: string | null;
  document_type?: string | null;
  author_name?: string | null;
  source_name?: string | null;
  created_at?: number | string | null;
  updated_at?: number | string | null;
  access_control?: string[] | null;
}): Document {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content ?? undefined,
    url: doc.url ?? undefined,
    teamId: doc.team_id,
    connectorType: doc.connector_type ?? undefined,
    documentType: doc.document_type ?? undefined,
    authorName: doc.author_name ?? undefined,
    sourceName: doc.source_name ?? undefined,
    createdAt: doc.created_at ? Number(doc.created_at) : undefined,
    updatedAt: doc.updated_at ? Number(doc.updated_at) : undefined,
    accessControl: doc.access_control ?? undefined,
  };
}

type UnifiedSearchItem = {
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
};

function adaptUnifiedDocumentItem(
  doc: {
    id: string;
    title: string;
    content?: string | null;
    url?: string | null;
    connector_type?: string | null;
    author_name?: string | null;
    created_at?: number | string | null;
    updated_at?: number | string | null;
  },
  relevance: number
): UnifiedSearchItem {
  return {
    id: doc.id,
    type: "document" as const,
    title: doc.title,
    content: doc.content ?? undefined,
    url: doc.url ?? undefined,
    connectorType: doc.connector_type ?? undefined,
    relevanceScore: relevance,
    authorName: doc.author_name ?? undefined,
    createdAt: doc.created_at ? Number(doc.created_at) : undefined,
    updatedAt: doc.updated_at ? Number(doc.updated_at) : undefined,
  };
}

function adaptUnifiedMediaItem(
  media: {
    id: string;
    title: string;
    description?: string | null;
    media_summary?: string | null;
    transcript?: string | null;
    url?: string | null;
    connector_type?: string | null;
    author_name?: string | null;
    created_at?: number | string | null;
    updated_at?: number | string | null;
  },
  relevance: number
): UnifiedSearchItem {
  const mediaContent = [
    media.description,
    media.media_summary,
    media.transcript,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: media.id,
    type: "media" as const,
    title: media.title,
    content: mediaContent || undefined,
    url: media.url ?? undefined,
    connectorType: media.connector_type ?? undefined,
    relevanceScore: relevance,
    authorName: media.author_name ?? undefined,
    createdAt: media.created_at ? Number(media.created_at) : undefined,
    updatedAt: media.updated_at ? Number(media.updated_at) : undefined,
  };
}

function adaptQueryAnalysis(
  analysis: ReturnType<typeof analyzeQuery>
): QueryAnalysis {
  return {
    normalizedQuery: analysis.normalizedQuery,
    intent: analysis.intent,
    entities: analysis.entities.map((e) => ({
      text: e.text,
      type: e.type,
      confidence: e.confidence,
    })),
    searchTerms: analysis.subQueries,
    temporal: analysis.temporalContext
      ? {
          type: analysis.temporalContext.type,
          value: analysis.temporalContext.description,
        }
      : undefined,
  };
}

function toRAGChunk(doc: Document, index: number): RAGChunk {
  return {
    id: `${doc.id}_chunk_${index}`,
    documentId: doc.id,
    documentTitle: doc.title,
    documentUrl: doc.url,
    connectorType: doc.connectorType || "unknown",
    content: doc.content || "",
    startOffset: 0,
    endOffset: (doc.content || "").length,
    score: 1,
    tokenCount: Math.ceil((doc.content || "").length / 4),
  };
}

function adaptGroundingResult(
  result: ReturnType<typeof verifyGrounding>
): GroundingResult {
  return {
    isGrounded: result.overallScore >= 0.7,
    overallScore: result.overallScore,
    confidence: result.confidence,
    claims: result.claims.map((c) => ({
      claim: c.claim,
      supported: c.supported,
      confidence: c.confidence,
      evidenceSnippet: c.evidenceSnippet ?? undefined,
    })),
  };
}

export interface ToolServicesOptions {
  orchestrator?: ContextOrchestrator;
}

function createContextServices(
  orchestrator?: ContextOrchestrator
): ToolServices["context"] {
  if (!orchestrator) {
    const store = new Map<
      string,
      { name: string; content: string; preview: string }
    >();
    let fileCounter = 0;

    return {
      storeVirtualFile(name: string, content: string): VirtualFileInfo {
        fileCounter += 1;
        const fileId = `vf_${fileCounter}_${Date.now()}`;
        const preview = content.slice(0, 200);
        const tokenCount = Math.ceil(content.length / 4);
        store.set(fileId, { name, content, preview });
        return { fileId, name, preview, tokenCount };
      },
      retrieveVirtualFile(fileId: string): string | null {
        return store.get(fileId)?.content ?? null;
      },
      retrieveVirtualFileChunk(
        fileId: string,
        start: number,
        end: number
      ): string | null {
        const file = store.get(fileId);
        return file ? file.content.slice(start, end) : null;
      },
      listVirtualFiles(): VirtualFileInfo[] {
        const files: VirtualFileInfo[] = [];
        for (const [fileId, file] of store) {
          files.push({
            fileId,
            name: file.name,
            preview: file.preview,
            tokenCount: Math.ceil(file.content.length / 4),
          });
        }
        return files;
      },
      deleteVirtualFile(fileId: string): boolean {
        return store.delete(fileId);
      },
    };
  }

  const virtualFileStore = orchestrator.getVirtualFileStore();

  return {
    storeVirtualFile(name: string, content: string): VirtualFileInfo {
      const ref = virtualFileStore.store(name, content);
      return {
        fileId: ref.fileId,
        name: ref.name,
        preview: ref.preview,
        tokenCount: ref.tokenCount,
      };
    },
    retrieveVirtualFile(fileId: string): string | null {
      return virtualFileStore.retrieve(fileId);
    },
    retrieveVirtualFileChunk(
      fileId: string,
      start: number,
      end: number
    ): string | null {
      return virtualFileStore.retrieveChunk(fileId, start, end);
    },
    listVirtualFiles(): VirtualFileInfo[] {
      return virtualFileStore.listReferences().map((ref) => ({
        fileId: ref.fileId,
        name: ref.name,
        preview: ref.preview,
        tokenCount: ref.tokenCount,
      }));
    },
    deleteVirtualFile(fileId: string): boolean {
      return virtualFileStore.delete(fileId);
    },
  };
}

const SQL_GENERATION_PROMPT = `You are a SQL expert. Convert the user's natural language question into a valid DuckDB SQL query.

SCHEMA:
{schema}

VIEW NAME: {viewName}

RULES:
1. Use only SELECT statements
2. Reference the table as "{viewName}"
3. Use proper column quoting with double quotes for column names
4. Return valid DuckDB SQL syntax
5. Keep queries simple and efficient

Respond with a JSON object:
{
  "sql": "your SQL query here",
  "explanation": "brief explanation of what the query does"
}`;

interface DocumentInfo {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  teamId: string;
}

async function fetchGenericDocumentInfo(
  documentId: string
): Promise<DocumentInfo | null> {
  const doc = await vespaClient.getDocument(documentId);
  if (!doc) {
    return null;
  }
  const metadata = doc.metadata as Record<string, unknown> | undefined;
  const storageKey =
    (metadata?.storageKey as string | undefined) ??
    (metadata?.storage_key as string | undefined);
  if (!storageKey) {
    return null;
  }
  return {
    id: doc.id,
    fileName: doc.file_name ?? doc.title ?? "unknown",
    storageKey,
    mimeType: doc.mime_type ?? "application/octet-stream",
    teamId: doc.team_id,
  };
}

function createAnalyticsServices(): ToolServices["analytics"] {
  let analyticsServiceInstance: AnalyticsService | null = null;

  function getAnalyticsService(): AnalyticsService {
    if (!analyticsServiceInstance) {
      const storage = getStorageProvider();
      const completionService = new CompletionService();

      analyticsServiceInstance = createAnalyticsService({
        async downloadFile(storageKey: string): Promise<Buffer> {
          const signedUrl = await storage.getSignedUrl(storageKey, 300);
          const response = await fetch(signedUrl);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        },
        async getDocument(documentId: string) {
          const spreadsheetDoc =
            await vespaClient.getSpreadsheetDocument(documentId);
          if (spreadsheetDoc) {
            return {
              id: spreadsheetDoc.id,
              fileName:
                spreadsheetDoc.file_name ?? spreadsheetDoc.title ?? "unknown",
              storageKey: spreadsheetDoc.storage_key,
              mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              teamId: spreadsheetDoc.team_id,
            };
          }
          return fetchGenericDocumentInfo(documentId);
        },
        async generateSqlWithLLM({ query, schema, viewName }) {
          const schemaDescription = schema.columns
            .map(
              (c) =>
                `  - ${c.name}: ${c.type}${c.nullable ? " (nullable)" : ""}`
            )
            .join("\n");

          const prompt = SQL_GENERATION_PROMPT.replace(
            "{schema}",
            `Table: ${viewName}\nColumns:\n${schemaDescription}\nRow count: ${schema.rowCount}`
          ).replace(/{viewName}/g, viewName);

          const result = await completionService.complete(
            [{ role: "user", content: `Question: ${query}` }],
            { systemPrompt: prompt, temperature: 0.1 }
          );

          try {
            const parsed = JSON.parse(result.content) as {
              sql: string;
              explanation: string;
            };
            return parsed;
          } catch {
            return {
              sql: `SELECT * FROM "${viewName}" LIMIT 10`,
              explanation: "Fallback query - could not parse LLM response",
            };
          }
        },
      });
    }
    return analyticsServiceInstance;
  }

  return {
    getSpreadsheetSchema(
      documentId: string,
      teamId: string
    ): Promise<SpreadsheetSchema> {
      const service = getAnalyticsService();
      return service.getSpreadsheetSchema(documentId, teamId);
    },

    generateSql(params: GenerateSqlParams): Promise<GenerateSqlResult> {
      const service = getAnalyticsService();
      return service.generateSql(params);
    },

    executeQuery(params: ExecuteQueryParams): Promise<SpreadsheetQueryResult> {
      const service = getAnalyticsService();
      return service.executeQuery(params);
    },
  };
}

type SyncJobStatus = "queued" | "running" | "completed" | "failed";

const SYNC_STATUS_MAP: Record<string, SyncJobStatus> = {
  PENDING: "queued",
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "failed",
  TIMEOUT: "failed",
  PAUSED: "queued",
};

const BULLMQ_STATE_MAP: Record<string, SyncJobStatus> = {
  active: "running",
  waiting: "queued",
  delayed: "queued",
  paused: "queued",
  prioritized: "queued",
  "waiting-children": "queued",
  completed: "completed",
  failed: "failed",
  unknown: "queued",
};

function calculatePercentComplete(
  processed: number,
  total: number | undefined
): number | undefined {
  if (!total || total <= 0) {
    return;
  }
  return Math.round((processed / total) * 100);
}

async function getStatusFromBullMQ(jobId: string) {
  const bullmqJob = await getSyncJob(jobId);
  if (!bullmqJob) {
    throw new Error(`Sync job not found: ${jobId}`);
  }

  const state = await bullmqJob.getState();
  const progress = bullmqJob.progress as
    | { processed?: number; total?: number }
    | undefined;
  const processed = progress?.processed ?? 0;
  const status = BULLMQ_STATE_MAP[state] ?? "queued";

  return {
    jobId,
    connectorId: bullmqJob.data.connectorId,
    status,
    progress: {
      documentsProcessed: processed,
      documentsTotal: progress?.total,
      percentComplete: calculatePercentComplete(processed, progress?.total),
    },
  };
}

function getStatusFromSyncHistory(
  jobId: string,
  syncHistory: {
    connectorId: string;
    status: string;
    dataAdded: number;
    dataUpdated: number;
    dataDeleted: number;
    dataSkipped: number;
    startedAt: Date;
    finishedAt: Date | null;
    errorMessage: string | null;
    syncJob: { itemsTotal: number | null } | null;
  }
) {
  const totalProcessed =
    syncHistory.dataAdded +
    syncHistory.dataUpdated +
    syncHistory.dataDeleted +
    syncHistory.dataSkipped;

  const total = syncHistory.syncJob?.itemsTotal ?? undefined;

  return {
    jobId,
    connectorId: syncHistory.connectorId,
    status: SYNC_STATUS_MAP[syncHistory.status] ?? "queued",
    progress: {
      documentsProcessed: totalProcessed,
      documentsTotal: total,
      percentComplete: calculatePercentComplete(totalProcessed, total),
    },
    startedAt: syncHistory.startedAt,
    completedAt: syncHistory.finishedAt ?? undefined,
    errorMessage: syncHistory.errorMessage ?? undefined,
  };
}

export function createToolServices(
  options: ToolServicesOptions = {}
): ToolServices {
  return {
    search: {
      async hybrid(params: SearchParams): Promise<SearchResponse> {
        const result = await hybridSearch({
          query: params.query,
          teamId: params.teamId,
          limit: params.limit,
          offset: params.offset,
          minScore: params.minScore,
          connectorTypes: params.connectorTypes,
          accessControlIds: params.accessControlIds,
        });

        return {
          documents: result.documents.map(adaptSearchResult),
          total: result.total,
          queryTime: result.queryTime,
          embeddingTime: result.embeddingTime,
        };
      },

      async semantic(params: SearchParams): Promise<SearchResponse> {
        const result = await semanticSearch({
          query: params.query,
          teamId: params.teamId,
          limit: params.limit,
          offset: params.offset,
          minScore: params.minScore,
          connectorTypes: params.connectorTypes,
          accessControlIds: params.accessControlIds,
        });

        return {
          documents: result.documents.map(adaptSearchResult),
          total: result.total,
          queryTime: result.queryTime,
          embeddingTime: result.embeddingTime,
        };
      },

      async keyword(params: SearchParams): Promise<SearchResponse> {
        const result = await keywordSearch({
          query: params.query,
          teamId: params.teamId,
          limit: params.limit,
          offset: params.offset,
          connectorTypes: params.connectorTypes,
          accessControlIds: params.accessControlIds,
        });

        return {
          documents: result.documents.map(adaptSearchResult),
          total: result.total,
          queryTime: result.queryTime,
        };
      },

      async unified(
        params: UnifiedSearchParams
      ): Promise<UnifiedSearchResponse> {
        const result = await searchService.searchUnified({
          query: params.query,
          teamId: params.teamId,
          limit: params.limit,
          accessControlIds: params.accessControlIds,
          connectorTypes: params.connectorTypes,
          includeDocuments: params.includeDocuments ?? true,
          includeMedia: params.includeMedia ?? true,
        });

        const items = result.items.map((item) =>
          item.type === "document"
            ? adaptUnifiedDocumentItem(item.data, item.relevance)
            : adaptUnifiedMediaItem(item.data, item.relevance)
        );

        return {
          items,
          total: result.total,
          queryTime: result.queryTime,
          embeddingTime: result.embeddingTime,
        };
      },

      async export(params: {
        teamId: string;
        query: string;
        format: "json" | "csv" | "markdown";
        limit?: number;
      }) {
        const searchResult = await hybridSearch({
          query: params.query,
          teamId: params.teamId,
          limit: params.limit ?? 100,
        });

        const fileName = `search-export-${Date.now()}.${params.format}`;
        let content: string;

        if (params.format === "json") {
          content = JSON.stringify(searchResult.documents, null, 2);
        } else if (params.format === "csv") {
          const headers = [
            "id",
            "title",
            "url",
            "connectorType",
            "relevanceScore",
          ];
          const rows = searchResult.documents.map((d) =>
            [
              d.id,
              d.title,
              d.url ?? "",
              d.connector_type ?? "",
              d.relevanceScore ?? 0,
            ].join(",")
          );
          content = [headers.join(","), ...rows].join("\n");
        } else {
          content = searchResult.documents
            .map((d) => `## ${d.title}\n\n${d.content ?? ""}\n\n---`)
            .join("\n\n");
        }

        const contextServices = createContextServices(options.orchestrator);
        const fileInfo = contextServices.storeVirtualFile(fileName, content);

        return {
          fileId: fileInfo.fileId,
          fileName,
          format: params.format,
          size: content.length,
        };
      },

      async save(params: {
        teamId: string;
        userId: string;
        name: string;
        query: string;
        filters?: Record<string, unknown>;
      }) {
        const savedSearch = await createSavedSearch(prisma, {
          teamId: params.teamId,
          userId: params.userId,
          name: params.name,
          query: params.query,
          filters: params.filters,
        });

        return { savedSearchId: savedSearch.id, name: savedSearch.name };
      },
    },

    rag: {
      async answer(params: RAGParams): Promise<RAGResponse> {
        const result = await ragAnswer({
          query: params.query,
          teamId: params.teamId,
          topK: params.topK,
          maxTokens: params.maxTokens,
          temperature: params.temperature,
          accessControlIds: params.accessControlIds,
          includeMedia: params.includeMedia,
        });

        return {
          answer: result.answer,
          citations: result.citations.map((c) => ({
            documentId: c.documentId,
            title: c.title,
            url: c.url,
            snippet: c.snippet,
            connectorType: c.connectorType,
            relevanceScore: c.relevanceScore,
          })),
          context: {
            documentCount: result.context.documents.length,
            totalTokens: result.context.totalTokens,
            truncated: result.context.truncated,
          },
          usage: result.usage,
          latencyMs: result.latencyMs,
        };
      },

      analyzeQuery(_query: string): QueryAnalysis {
        const analysis = analyzeQuery(_query);
        return adaptQueryAnalysis(analysis);
      },

      verifyGrounding(
        _response: string,
        documents: Document[]
      ): GroundingResult {
        const chunks: RAGChunk[] = documents.map((doc, i) =>
          toRAGChunk(doc, i)
        );
        const result = verifyGrounding(_response, chunks);
        return adaptGroundingResult(result);
      },

      async synthesize(params: {
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
      }) {
        const startTime = performance.now();
        const completionService = new CompletionService();

        const contextText = params.chunks
          .map(
            (c, i) =>
              `[${i + 1}] ${c.documentTitle ?? "Document"}\n${c.content}`
          )
          .join("\n\n---\n\n");

        const systemPrompt = `You are a helpful assistant that synthesizes information from provided context.
${params.instructions ?? ""}

CONTEXT:
${contextText}

Answer the question using ONLY the information from the context above.
Cite sources using [n] notation where n is the document number.`;

        const result = await completionService.complete(
          [{ role: "user", content: params.question }],
          {
            systemPrompt,
            temperature: params.temperature ?? 0.3,
            maxTokens: params.maxOutputTokens ?? 1024,
          }
        );

        const citations = params.chunks.map((c, i) => ({
          documentId: c.documentId,
          chunkIndex: i,
          snippet: c.content.slice(0, 200),
          relevance: 1 - i * 0.1,
        }));

        return {
          answer: result.content,
          citations,
          usage: {
            promptTokens: result.usage?.inputTokens ?? 0,
            completionTokens: result.usage?.outputTokens ?? 0,
            totalTokens: result.usage?.totalTokens ?? 0,
          },
          latencyMs: performance.now() - startTime,
        };
      },
    },

    documents: {
      async get(id: string): Promise<Document | null> {
        const doc = await vespaClient.getDocument(id);
        if (!doc) {
          return null;
        }
        return adaptDocument(doc);
      },

      async list(params: {
        teamId: string;
        limit?: number;
        offset?: number;
        connectorType?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
      }): Promise<{ documents: Document[]; total: number }> {
        const conditions = [
          `team_id contains "${escapeYqlString(params.teamId)}"`,
        ];

        if (params.connectorType) {
          conditions.push(
            `connector_type contains "${escapeYqlString(params.connectorType)}"`
          );
        }

        const sortField = params.sortBy || "updated_at";
        const sortOrder = params.sortOrder || "desc";
        const limit = params.limit || 20;
        const offset = params.offset || 0;

        const yql = `select id, title, url, connector_type, document_type, author_name, source_name, created_at, updated_at, team_id from openplane_document where ${conditions.join(" and ")} order by ${sortField} ${sortOrder} limit ${limit} offset ${offset}`;

        const result = await vespaClient.query({
          yql,
          hits: limit,
          offset,
        });

        const documents = (result.root.children ?? []).map((child) => {
          const doc = child.fields as {
            id: string;
            title: string;
            url?: string;
            connector_type?: string;
            document_type?: string;
            author_name?: string;
            source_name?: string;
            created_at?: number;
            updated_at?: number;
            team_id: string;
          };
          return adaptDocument(doc);
        });

        const total =
          (result.root.fields?.totalCount as number) ?? documents.length;

        return { documents, total };
      },

      async getChunks(documentId: string): Promise<DocumentChunk[]> {
        const doc = await vespaClient.getDocument(documentId);
        if (!doc?.content) {
          return [];
        }

        const CHUNK_SIZE = 1000;
        const chunks: DocumentChunk[] = [];
        const content = doc.content;

        for (let i = 0; i < content.length; i += CHUNK_SIZE) {
          const chunkContent = content.slice(i, i + CHUNK_SIZE);
          chunks.push({
            id: `${documentId}_chunk_${chunks.length}`,
            documentId,
            content: chunkContent,
            position: chunks.length,
            tokenCount: Math.ceil(chunkContent.length / 4),
          });
        }

        return chunks;
      },

      async export(params: {
        documentId: string;
        teamId: string;
        format: "json" | "markdown" | "text";
      }) {
        const doc = await vespaClient.getDocument(params.documentId);
        if (!doc) {
          throw new Error(`Document not found: ${params.documentId}`);
        }

        let extension: string;
        let outputFormat: "json" | "csv" | "markdown";
        if (params.format === "json") {
          extension = "json";
          outputFormat = "json";
        } else if (params.format === "markdown") {
          extension = "md";
          outputFormat = "markdown";
        } else {
          extension = "csv";
          outputFormat = "csv";
        }

        const fileName = `${doc.title ?? "document"}-${Date.now()}.${extension}`;
        let content: string;

        if (params.format === "json") {
          content = JSON.stringify(adaptDocument(doc), null, 2);
        } else if (params.format === "markdown") {
          content = `# ${doc.title}\n\n${doc.content ?? ""}`;
        } else {
          content = doc.content ?? "";
        }

        const contextServices = createContextServices(options.orchestrator);
        const fileInfo = contextServices.storeVirtualFile(fileName, content);

        return {
          fileId: fileInfo.fileId,
          fileName,
          format: outputFormat,
          size: content.length,
        };
      },

      async share(params: {
        documentId: string;
        teamId: string;
        userId: string;
        expiresInHours?: number;
      }) {
        const expiresAt = params.expiresInHours
          ? new Date(Date.now() + params.expiresInHours * 3600 * 1000)
          : undefined;

        const shareLink = await createShareLink(prisma, {
          teamId: params.teamId,
          userId: params.userId,
          documentId: params.documentId,
          expiresAt,
        });

        return {
          shareId: shareLink.id,
          shareUrl: `/shared/${shareLink.id}`,
          expiresAt: shareLink.expiresAt ?? undefined,
        };
      },
    },

    connectors: {
      async list(teamId: string): Promise<Connector[]> {
        const connectors = await listConnectorsByTeam(prisma, teamId);
        return connectors.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.app,
          status: c.status,
          lastSyncAt: c.lastSyncedAt,
          documentCount: 0,
          errorMessage: c.statusMessage ?? undefined,
          createdAt: c.createdAt,
        }));
      },

      async get(id: string): Promise<Connector | null> {
        const connector = await findConnectorById(prisma, id, false);
        if (!connector) {
          return null;
        }

        return {
          id: connector.id,
          name: connector.name,
          type: connector.app,
          status: connector.status,
          lastSyncAt: connector.lastSyncedAt,
          documentCount: 0,
          errorMessage: connector.statusMessage ?? undefined,
          createdAt: connector.createdAt,
        };
      },

      async getSyncHistory(
        connectorId: string,
        limit = 10
      ): Promise<SyncHistoryEntry[]> {
        const history = await prisma.syncHistory.findMany({
          where: { connectorId },
          orderBy: { startedAt: "desc" },
          take: limit,
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            dataAdded: true,
            dataUpdated: true,
            dataDeleted: true,
            dataSkipped: true,
            errorMessage: true,
          },
        });

        return history.map((h) => ({
          id: h.id,
          status: h.status,
          startedAt: h.startedAt,
          completedAt: h.finishedAt,
          documentsProcessed:
            h.dataAdded + h.dataUpdated + h.dataDeleted + h.dataSkipped,
          errorMessage: h.errorMessage ?? undefined,
        }));
      },

      async getSyncHistoryPaginated(params: {
        connectorId: string;
        limit?: number;
        offset?: number;
      }) {
        const limit = params.limit ?? 10;
        const offset = params.offset ?? 0;

        const [history, total] = await Promise.all([
          prisma.syncHistory.findMany({
            where: { connectorId: params.connectorId },
            orderBy: { startedAt: "desc" },
            take: limit,
            skip: offset,
            select: {
              id: true,
              status: true,
              startedAt: true,
              finishedAt: true,
              dataAdded: true,
              dataUpdated: true,
              dataDeleted: true,
              dataSkipped: true,
              errorMessage: true,
            },
          }),
          prisma.syncHistory.count({
            where: { connectorId: params.connectorId },
          }),
        ]);

        const entries: SyncHistoryEntry[] = history.map((h) => ({
          id: h.id,
          status: h.status,
          startedAt: h.startedAt,
          completedAt: h.finishedAt,
          documentsProcessed:
            h.dataAdded + h.dataUpdated + h.dataDeleted + h.dataSkipped,
          errorMessage: h.errorMessage ?? undefined,
        }));

        return {
          entries,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + entries.length < total,
          },
        };
      },

      async triggerSync(params: {
        connectorId: string;
        teamId: string;
        syncType: "full" | "incremental";
        priority: "low" | "normal" | "high";
      }) {
        const connector = await findConnectorById(
          prisma,
          params.connectorId,
          false
        );
        if (!connector) {
          throw new Error(`Connector not found: ${params.connectorId}`);
        }

        if (connector.teamId !== params.teamId) {
          throw new Error("Connector does not belong to this team");
        }

        const syncType = params.syncType === "full" ? "FULL" : "INCREMENTAL";
        const priorityMap = { low: 3, normal: 5, high: 7 };
        const jobPriority = priorityMap[params.priority];

        const syncResult = await triggerSync(prisma, {
          connectorId: params.connectorId,
          type: syncType,
        });

        const jobData: SyncJobData = {
          connectorId: params.connectorId,
          syncJobId: syncResult.syncHistoryId,
          type: syncType,
          trigger: "MANUAL",
          priority: jobPriority,
        };

        const bullmqJob = await addSyncJob(jobData, jobPriority);

        return {
          jobId: syncResult.syncHistoryId,
          queueJobId: bullmqJob.id ?? "",
          connectorId: params.connectorId,
          syncType: params.syncType,
          queued: true,
          queuePosition: 1,
          estimatedStartTime: new Date(Date.now() + 5000),
        };
      },

      async getSyncJobStatus(jobId: string) {
        const syncHistory = await prisma.syncHistory.findUnique({
          where: { id: jobId },
          include: { syncJob: true },
        });

        if (!syncHistory) {
          return getStatusFromBullMQ(jobId);
        }

        return getStatusFromSyncHistory(jobId, syncHistory);
      },

      async pause(connectorId: string, _teamId: string) {
        const connector = await findConnectorById(prisma, connectorId, false);
        if (!connector) {
          throw new Error(`Connector not found: ${connectorId}`);
        }

        await prisma.connector.update({
          where: { id: connectorId },
          data: { status: "PAUSED" },
        });

        return {
          connectorId,
          previousStatus: connector.status,
          newStatus: "PAUSED",
          message: `Connector ${connector.name} has been paused`,
        };
      },

      async resume(connectorId: string, _teamId: string) {
        const connector = await findConnectorById(prisma, connectorId, false);
        if (!connector) {
          throw new Error(`Connector not found: ${connectorId}`);
        }

        await prisma.connector.update({
          where: { id: connectorId },
          data: { status: "ACTIVE" },
        });

        return {
          connectorId,
          previousStatus: connector.status,
          newStatus: "ACTIVE",
          message: `Connector ${connector.name} has been resumed`,
        };
      },
    },

    discovery: {
      async getCapabilities(teamId: string) {
        const connectors = await listConnectorsByTeam(prisma, teamId);

        const totalCountYql = `select id from openplane_document where team_id contains "${escapeYqlString(teamId)}" limit 0`;
        const totalCountResult = await vespaClient.query({
          yql: totalCountYql,
          hits: 0,
        });
        const totalDocuments =
          (totalCountResult.root?.fields?.totalCount as number) ?? 0;

        const connectorCounts = await Promise.all(
          connectors.map(async (c) => {
            const countYql = `select id from openplane_document where connector_id contains "${escapeYqlString(c.id)}" limit 0`;
            const result = await vespaClient.query({ yql: countYql, hits: 0 });
            return {
              connectorId: c.id,
              count: (result.root?.fields?.totalCount as number) ?? 0,
            };
          })
        );

        const countMap = new Map(
          connectorCounts.map((cc) => [cc.connectorId, cc.count])
        );

        return {
          connectors: connectors.map((c) => ({
            type: c.app,
            name: c.name,
            documentCount: countMap.get(c.id) ?? 0,
            lastSyncAt: c.lastSyncedAt,
            status: c.status,
          })),
          tools: [
            {
              name: "search_hybrid",
              category: "search",
              description: "Hybrid search across all sources",
            },
            {
              name: "search_semantic",
              category: "search",
              description: "Semantic similarity search",
            },
            {
              name: "rag_answer",
              category: "rag",
              description: "Generate answers from context",
            },
            {
              name: "doc_get",
              category: "documents",
              description: "Retrieve document by ID",
            },
          ],
          stats: {
            totalDocuments,
            totalConnectors: connectors.length,
            activeConnectors: connectors.filter((c) => c.status === "ACTIVE")
              .length,
          },
        };
      },
    },

    preferences: {
      async get(userId: string, teamId: string) {
        const profile = await findUserSearchProfile(prisma, userId, teamId);

        if (!profile) {
          return {
            preferredSources: [] as string[],
            excludedSources: [] as string[],
            defaultSearchLimit: 10,
            dateRangeDefault: "all" as const,
            resultDisplayMode: "detailed" as const,
            personalizationEnabled: true,
            department: null as string | null,
          };
        }

        const connectorWeights = profile.connectorWeights;
        const preferredSources = Object.entries(connectorWeights)
          .filter(([, weight]) => weight > 0.5)
          .sort(([, a], [, b]) => b - a)
          .map(([source]) => source);

        const excludedSources = Object.entries(connectorWeights)
          .filter(([, weight]) => weight < 0.2)
          .map(([source]) => source);

        return {
          preferredSources,
          excludedSources,
          defaultSearchLimit: 10,
          dateRangeDefault: "all" as const,
          resultDisplayMode: "detailed" as const,
          personalizationEnabled: profile.personalizationEnabled,
          department: profile.department,
        };
      },

      async update(
        userId: string,
        teamId: string,
        preferences: {
          preferredSources?: string[];
          excludedSources?: string[];
          defaultSearchLimit?: number;
          dateRangeDefault?: "day" | "week" | "month" | "year" | "all";
          resultDisplayMode?: "compact" | "detailed";
          personalizationEnabled?: boolean;
          department?: string | null;
        }
      ) {
        await upsertUserProfilePreferences(prisma, userId, teamId, {
          personalizationEnabled: preferences.personalizationEnabled,
          department: preferences.department,
        });

        return {
          preferredSources: preferences.preferredSources ?? [],
          excludedSources: preferences.excludedSources ?? [],
          defaultSearchLimit: preferences.defaultSearchLimit ?? 10,
          dateRangeDefault: preferences.dateRangeDefault ?? "all",
          resultDisplayMode: preferences.resultDisplayMode ?? "detailed",
          personalizationEnabled: preferences.personalizationEnabled ?? true,
          department: preferences.department ?? null,
        };
      },
    },

    context: createContextServices(options.orchestrator),

    analytics: createAnalyticsServices(),
  };
}
