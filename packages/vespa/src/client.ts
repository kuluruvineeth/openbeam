import { LRUCache } from "lru-cache";
import { Agent } from "undici";
import {
  type BatchFailure,
  type BatchResult,
  createBatchResult,
  isRetryableError,
} from "./batch-types";
import { escapeYqlString } from "./query";
import type {
  DetailedHealthStatus,
  Entity,
  FeedResponse,
  GenericDocument,
  MediaDocument,
  MediaQueryParams,
  QueryMetrics,
  QueryParams,
  SearchResult,
  SpreadsheetDocument,
  SpreadsheetQueryParams,
  VespaEmbeddingCell,
  VespaError,
  VespaGenericDocumentForFeed,
  VespaMediaDocumentForFeed,
  VespaMediaQueryBody,
  VespaMediaUpdatePayload,
  VespaQueryBody,
  VespaSpreadsheetDocumentForFeed,
  VespaTimestampCell,
} from "./schemas";

export interface VespaClientOptions {
  keepAliveTimeout?: number;
  keepAliveMaxTimeout?: number;
  connections?: number;
  pipelining?: number;
  enableCache?: boolean;
  cacheTtlMs?: number;
  cacheMaxSize?: number;
}

const DEFAULT_CLIENT_OPTIONS: VespaClientOptions = {
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  connections: 10,
  pipelining: 1,
  enableCache: false,
  cacheTtlMs: 30_000,
  cacheMaxSize: 1000,
};

export class VespaClient {
  private readonly baseUrl: string;
  private readonly documentApiUrl: string;
  private readonly searchApiUrl: string;
  private readonly agent: Agent;
  private readonly cache: LRUCache<string, SearchResult> | null;

  constructor(baseUrl?: string, options?: VespaClientOptions) {
    this.baseUrl = baseUrl || process.env.VESPA_URL || "http://localhost:8080";
    this.documentApiUrl = `${this.baseUrl}/document/v1`;
    this.searchApiUrl = `${this.baseUrl}/search/`;

    const mergedOptions = { ...DEFAULT_CLIENT_OPTIONS, ...options };
    this.agent = new Agent({
      keepAliveTimeout: mergedOptions.keepAliveTimeout,
      keepAliveMaxTimeout: mergedOptions.keepAliveMaxTimeout,
      connections: mergedOptions.connections,
      pipelining: mergedOptions.pipelining,
    });

    this.cache = mergedOptions.enableCache
      ? new LRUCache<string, SearchResult>({
          max: mergedOptions.cacheMaxSize ?? 1000,
          ttl: mergedOptions.cacheTtlMs ?? 30_000,
        })
      : null;
  }

  async close(): Promise<void> {
    if (typeof this.agent.close === "function") {
      await this.agent.close();
    }
    this.cache?.clear();
  }

  private getCacheKey(params: QueryParams): string {
    const timeout = normalizeVespaTimeout(params.timeout);
    const keyParts = [
      params.yql,
      params.ranking ?? "",
      String(params.hits ?? 20),
      String(params.offset ?? 0),
      timeout ?? "",
    ];

    if (params.query_embedding) {
      keyParts.push(
        `qe:${params.query_embedding.values.slice(0, 5).join(",")}`
      );
    }
    if (params.embedding_v2) {
      keyParts.push(`e2:${params.embedding_v2.values.slice(0, 5).join(",")}`);
    }
    if (params.sparse_embedding?.cells) {
      keyParts.push(`se:${params.sparse_embedding.cells.length}`);
    }

    return keyParts.join("|");
  }

  private isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;
    const isAbortError = error instanceof Error && error.name === "AbortError";

    return (
      errorCode === "ECONNRESET" ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("socket") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("closed unexpectedly") ||
      isAbortError
    );
  }

  private async getResponseError(response: Response): Promise<string> {
    try {
      const error = (await response.json()) as VespaError;
      return error.message || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  async feedDocument(doc: GenericDocument, retries = 3): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${doc.id}`;

    const docForVespa: VespaGenericDocumentForFeed = {
      ...doc,
      metadata: doc.metadata ? JSON.stringify(doc.metadata) : undefined,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(documentPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: docForVespa }),
          signal: AbortSignal.timeout(60_000),
          // @ts-expect-error undici dispatcher type
          dispatcher: this.agent,
        });

        if (!response.ok) {
          const errorMessage = await this.getResponseError(response);
          throw new Error(`Vespa feed error: ${errorMessage}`);
        }

        return (await response.json()) as FeedResponse;
      } catch (error: unknown) {
        const shouldRetry = this.isRetryableError(error) && attempt < retries;

        if (shouldRetry) {
          const delay = 2 ** attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to feed document after retries");
  }

  async feedBatch(docs: GenericDocument[]): Promise<BatchResult> {
    const succeeded: string[] = [];
    const failed: BatchFailure[] = [];

    const batchSize = 10;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((doc) => this.feedDocument(doc))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const doc = batch[j];
        if (!(result && doc)) {
          continue;
        }

        if (result.status === "fulfilled") {
          succeeded.push(doc.id);
        } else {
          const error = result.reason;
          failed.push({
            documentId: doc.id,
            error: error instanceof Error ? error.message : String(error),
            retryable: isRetryableError(error),
          });
        }
      }
    }

    return createBatchResult(succeeded, failed, docs.length);
  }

  async feedEntity(entity: Entity): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/entity/docid/${entity.id}`;

    const response = await fetch(documentPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: entity }),
      signal: AbortSignal.timeout(60_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa feed error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as FeedResponse;
  }

  async query<T = GenericDocument>(
    params: QueryParams
  ): Promise<SearchResult<T>> {
    const { result } = await this.queryWithMetrics<T>(params);
    return result;
  }

  private hasVectorFeatures(params: QueryParams): boolean {
    return (
      !!params.query_embedding ||
      !!params.embedding_v2 ||
      !!params.sparse_embedding
    );
  }

  private buildQueryBody(params: QueryParams): VespaQueryBody {
    const timeout = normalizeVespaTimeout(params.timeout);
    return {
      yql: params.yql,
      hits: params.hits ?? 20,
      offset: params.offset ?? 0,
      "ranking.profile": params.ranking,
      timeout,
      "input.query(query_embedding)": params.query_embedding,
      "input.query(title_embedding)": params.title_embedding,
      "input.query(topic_embedding)": params.topic_embedding,
      "input.query(user_dept_embedding)": params.user_dept_embedding,
      "input.query(embedding_v2)": params.embedding_v2,
      "input.query(sparse_embedding)": params.sparse_embedding,
    };
  }

  private buildQueryUrl(params: QueryParams): string {
    const queryParams = new URLSearchParams();
    queryParams.set("yql", params.yql);

    if (params.ranking) {
      queryParams.set("ranking.profile", params.ranking);
    }
    if (params.hits) {
      queryParams.set("hits", params.hits.toString());
    }
    if (params.offset) {
      queryParams.set("offset", params.offset.toString());
    }
    if (params.timeout) {
      queryParams.set("timeout", normalizeVespaTimeout(params.timeout) ?? "");
    }

    return `${this.searchApiUrl}?${queryParams}`;
  }

  private extractMetrics<T>(
    result: SearchResult<T>,
    latencyMs: number
  ): QueryMetrics {
    const coverage = result.root?.coverage ?? {
      full: true,
      degraded: { "match-phase": false, timeout: false },
    };

    return {
      latencyMs,
      coverage: {
        full: coverage.full,
        timeout: coverage.degraded?.timeout ?? false,
        matchPhase: coverage.degraded?.["match-phase"] ?? false,
      },
      resultCount: result.root?.children?.length ?? 0,
    };
  }

  private async executeVectorQuery<T>(
    params: QueryParams
  ): Promise<SearchResult<T>> {
    const body = this.buildQueryBody(params);

    const response = await fetch(this.searchApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const errorText = await safeReadResponseText(response);
      const parsed = safeParseVespaError(errorText);
      const message =
        parsed?.message || response.statusText || "Unknown Vespa error";

      throw new Error(
        `Vespa query error (${response.status}): ${message}\n` +
          `yql=${params.yql}\n` +
          `response=${truncateForLog(errorText)}`
      );
    }

    return (await response.json()) as SearchResult<T>;
  }

  private async executeSimpleQuery<T>(
    params: QueryParams
  ): Promise<SearchResult<T>> {
    const url = this.buildQueryUrl(params);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const errorText = await safeReadResponseText(response);
      const parsed = safeParseVespaError(errorText);
      const message =
        parsed?.message || response.statusText || "Unknown Vespa error";

      throw new Error(
        `Vespa query error (${response.status}): ${message}\n` +
          `url=${url}\n` +
          `response=${truncateForLog(errorText)}`
      );
    }

    return (await response.json()) as SearchResult<T>;
  }

  async queryWithMetrics<T = GenericDocument>(
    params: QueryParams
  ): Promise<{ result: SearchResult<T>; metrics: QueryMetrics }> {
    const startTime = performance.now();

    const result = this.hasVectorFeatures(params)
      ? await this.executeVectorQuery<T>(params)
      : await this.executeSimpleQuery<T>(params);

    const latencyMs = performance.now() - startTime;
    const metrics = this.extractMetrics(result, latencyMs);

    return { result, metrics };
  }

  async queryBatch<T = GenericDocument>(
    paramsArray: QueryParams[]
  ): Promise<SearchResult<T>[]> {
    const results = await Promise.all(
      paramsArray.map((params) => this.query<T>(params))
    );
    return results;
  }

  async queryCached<T = GenericDocument>(
    params: QueryParams
  ): Promise<SearchResult<T>> {
    if (!this.cache) {
      return this.query<T>(params);
    }

    const cacheKey = this.getCacheKey(params);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as SearchResult<T>;
    }

    const result = await this.query<T>(params);
    this.cache.set(cacheKey, result as SearchResult);
    return result;
  }

  async *visitDocuments<T = GenericDocument>(options: {
    schema?:
      | "openplane_document"
      | "media_document"
      | "entity"
      | "spreadsheet_document";
    selection?: string;
    fieldSet?: string;
    wantedDocumentCount?: number;
    slices?: number;
    sliceId?: number;
  }): AsyncGenerator<T[], void, undefined> {
    const schema = options.schema ?? "openplane_document";
    const params = new URLSearchParams();

    if (options.selection) {
      params.set("selection", options.selection);
    }
    if (options.fieldSet) {
      params.set("fieldSet", options.fieldSet);
    }
    if (options.wantedDocumentCount) {
      params.set("wantedDocumentCount", options.wantedDocumentCount.toString());
    }
    if (options.slices !== undefined && options.sliceId !== undefined) {
      params.set("slices", options.slices.toString());
      params.set("sliceId", options.sliceId.toString());
    }

    params.set("cluster", "content");

    let continuation: string | undefined;

    do {
      if (continuation) {
        params.set("continuation", continuation);
      }

      const url = `${this.documentApiUrl}/default/${schema}/docid?${params}`;
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(60_000),
        // @ts-expect-error undici dispatcher type
        dispatcher: this.agent,
      });

      if (!response.ok) {
        const error = (await response.json()) as VespaError;
        throw new Error(
          `Vespa visit error: ${error.message || response.statusText}`
        );
      }

      const result = (await response.json()) as {
        documents?: Array<{ id: string; fields: T }>;
        continuation?: string;
      };

      if (result.documents && result.documents.length > 0) {
        yield result.documents.map((doc) => doc.fields);
      }

      continuation = result.continuation;
    } while (continuation);
  }

  async feedDocumentAsync(
    doc: GenericDocument
  ): Promise<{ operationId: string }> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${doc.id}?asynchronous=true`;

    const docForVespa: VespaGenericDocumentForFeed = {
      ...doc,
      metadata: doc.metadata ? JSON.stringify(doc.metadata) : undefined,
    };

    const response = await fetch(documentPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: docForVespa }),
      signal: AbortSignal.timeout(60_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const errorMessage = await this.getResponseError(response);
      throw new Error(`Vespa async feed error: ${errorMessage}`);
    }

    const result = (await response.json()) as { id: string };
    return { operationId: result.id };
  }

  async waitForAsyncOperation(
    operationId: string,
    timeoutMs = 30_000
  ): Promise<boolean> {
    const startTime = Date.now();

    // Construct proper URL - handle both relative paths and full URLs
    const operationUrl =
      operationId.startsWith("http://") || operationId.startsWith("https://")
        ? operationId
        : `${this.baseUrl}/operations/${operationId}`;

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(operationUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
        // @ts-expect-error undici dispatcher type
        dispatcher: this.agent,
      });

      if (response.status === 200) {
        return true;
      }

      if (response.status !== 202) {
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }

  async deleteDocument(id: string): Promise<void> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "DELETE",
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa delete error: ${error.message || response.statusText}`
      );
    }
  }

  async updateDocument(
    id: string,
    fields: Partial<GenericDocument>
  ): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa update error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as FeedResponse;
  }

  async partialUpdateDocument(
    id: string,
    fields: Record<string, unknown>
  ): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const updateFields: Record<string, { assign: unknown }> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateFields[key] = { assign: value };
      }
    }

    const response = await fetch(documentPath, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: updateFields }),
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa partial update error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as FeedResponse;
  }

  async partialUpdateBatch(
    updates: Array<{ id: string; fields: Record<string, unknown> }>,
    concurrency = 10
  ): Promise<BatchResult> {
    const succeeded: string[] = [];
    const failed: BatchFailure[] = [];

    for (let i = 0; i < updates.length; i += concurrency) {
      const batch = updates.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(({ id, fields }) => this.partialUpdateDocument(id, fields))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const update = batch[j];
        if (!(result && update)) {
          continue;
        }

        if (result.status === "fulfilled") {
          succeeded.push(update.id);
        } else {
          const error = result.reason;
          failed.push({
            documentId: update.id,
            error: error instanceof Error ? error.message : String(error),
            retryable: isRetryableError(error),
          });
        }
      }
    }

    return createBatchResult(succeeded, failed, updates.length);
  }

  async getDocument(id: string): Promise<GenericDocument | null> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa get error: ${error.message || response.statusText}`
      );
    }

    const result = (await response.json()) as { fields: GenericDocument };
    return result.fields;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ApplicationStatus`, {
        signal: AbortSignal.timeout(5000),
        // @ts-expect-error undici dispatcher type
        dispatcher: this.agent,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async healthCheckDetailed(): Promise<DetailedHealthStatus> {
    const status: DetailedHealthStatus = {
      healthy: false,
      containerUp: false,
      contentUp: false,
      searchLatencyMs: -1,
    };

    try {
      const containerResponse = await fetch(
        `${this.baseUrl}/ApplicationStatus`,
        {
          signal: AbortSignal.timeout(5000),
          // @ts-expect-error undici dispatcher type
          dispatcher: this.agent,
        }
      );
      status.containerUp = containerResponse.ok;

      if (status.containerUp) {
        const startTime = performance.now();
        const searchResponse = await fetch(
          `${this.searchApiUrl}?yql=select%20*%20from%20openplane_document%20where%20true%20limit%201`,
          {
            signal: AbortSignal.timeout(5000),
            // @ts-expect-error undici dispatcher type
            dispatcher: this.agent,
          }
        );
        status.searchLatencyMs = performance.now() - startTime;
        status.contentUp = searchResponse.ok;

        if (searchResponse.ok) {
          const result = (await searchResponse.json()) as SearchResult;
          status.documentCount = result.root?.fields?.totalCount;
        }
      }

      status.healthy = status.containerUp && status.contentUp;
    } catch {
      status.healthy = false;
    }

    return status;
  }

  async deleteByConnectorId(
    connectorId: string,
    schema: "openplane_document" | "media_document" | "entity"
  ): Promise<{ deleted: number }> {
    const selection = `${schema}.connector_id=="${connectorId}"`;
    const url = `${this.documentApiUrl}/default/${schema}/docid?selection=${encodeURIComponent(selection)}&cluster=content`;

    const response = await fetch(url, {
      method: "DELETE",
      signal: AbortSignal.timeout(120_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const errorMessage = await this.getResponseError(response);
      throw new Error(
        `Vespa bulk delete failed for ${schema} (status ${response.status}): ${errorMessage}`
      );
    }

    const result = (await response.json()) as { documentCount?: number };
    return { deleted: result.documentCount ?? 0 };
  }

  async feedMediaDocument(
    doc: MediaDocument,
    retries = 3
  ): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/media_document/docid/${doc.id}`;
    const vespaDoc = this.formatMediaForVespa(doc);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(documentPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: vespaDoc }),
          signal: AbortSignal.timeout(60_000),
          // @ts-expect-error undici dispatcher type
          dispatcher: this.agent,
        });

        if (!response.ok) {
          const errorMessage = await this.getResponseError(response);
          throw new Error(`Vespa media feed error: ${errorMessage}`);
        }

        return (await response.json()) as FeedResponse;
      } catch (error: unknown) {
        const shouldRetry = this.isRetryableError(error) && attempt < retries;

        if (shouldRetry) {
          const delay = 2 ** attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to feed media document after retries");
  }

  private formatMediaForVespa(doc: MediaDocument): VespaMediaDocumentForFeed {
    const embeddingCells: VespaEmbeddingCell[] = [];
    for (const [segId, embedding] of Object.entries(doc.segment_embeddings)) {
      for (let i = 0; i < embedding.length; i++) {
        const value = embedding[i];
        if (value !== undefined) {
          embeddingCells.push({
            address: { segment: segId, x: String(i) },
            value,
          });
        }
      }
    }

    const timestampCells: VespaTimestampCell[] = [];
    for (const [segId, timestamps] of Object.entries(doc.segment_timestamps)) {
      const [start, end] = timestamps;
      timestampCells.push({
        address: { segment: segId, t: "0" },
        value: start,
      });
      timestampCells.push({
        address: { segment: segId, t: "1" },
        value: end,
      });
    }

    return {
      id: doc.id,
      team_id: doc.team_id,
      connector_id: doc.connector_id,
      connector_type: doc.connector_type,
      external_id: doc.external_id,
      title: doc.title,
      description: doc.description ?? "",
      media_summary: doc.media_summary,
      media_keywords: doc.media_keywords,
      transcript: doc.transcript ?? "",
      duration_seconds: doc.duration_seconds,
      segment_count: doc.segment_count,
      segment_embeddings:
        embeddingCells.length > 0 ? { cells: embeddingCells } : undefined,
      segment_timestamps:
        timestampCells.length > 0 ? { cells: timestampCells } : undefined,
      segment_transcripts: doc.segment_transcripts,
      segment_descriptions: doc.segment_descriptions,
      segment_speakers: doc.segment_speakers,
      segment_ocr_text: doc.segment_ocr_text,
      transcript_embedding: doc.transcript_embedding,
      topic_embedding: doc.topic_embedding,
      source_id: doc.source_id ?? "",
      source_name: doc.source_name ?? "",
      source_type: doc.source_type ?? "",
      url: doc.url,
      thumbnail_url: doc.thumbnail_url ?? "",
      author_id: doc.author_id ?? "",
      author_name: doc.author_name ?? "",
      participants: doc.participants,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      indexed_at: doc.indexed_at ?? Date.now(),
      access_control: doc.access_control ?? [],
      is_public: doc.is_public,
      metadata: doc.metadata ? JSON.stringify(doc.metadata) : "",
      view_count: doc.view_count ?? 0,
      unique_viewers: doc.unique_viewers ?? 0,
      avg_watch_percentage: doc.avg_watch_percentage ?? 0,
      share_count: doc.share_count ?? 0,
      comment_count: doc.comment_count ?? 0,
      trending_score: doc.trending_score,
      chapters: doc.chapters ?? [],
      highlights: doc.highlights ?? [],
      transcript_segments: doc.transcript_segments ?? [],
      action_items: doc.action_items,
      detected_topics: doc.detected_topics,
      detected_logos: doc.detected_logos,
      entity_ids: doc.entity_ids,
      mentioned_entity_ids: doc.mentioned_entity_ids ?? [],
      related_document_ids: doc.related_document_ids ?? [],
      discussed_in_channels: doc.discussed_in_channels,
      content_hash: doc.content_hash ?? "",
      canonical_media_id: doc.canonical_media_id,
      media_type: doc.media_type,
      language: doc.language,
    };
  }

  async queryMedia<T = MediaDocument>(
    params: MediaQueryParams
  ): Promise<SearchResult<T>> {
    const timeout = normalizeVespaTimeout(params.timeout);
    const body: VespaMediaQueryBody = {
      yql: params.yql,
      hits: params.hits ?? 20,
      offset: params.offset ?? 0,
      "ranking.profile": params.ranking,
      timeout,
      "input.query(media_embedding)": params.media_embedding,
      "input.query(query_embedding)": params.query_embedding,
      "input.query(topic_embedding)": params.topic_embedding,
    };

    const response = await fetch(this.searchApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa media query error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as SearchResult<T>;
  }

  async deleteMediaDocument(id: string): Promise<void> {
    const documentPath = `${this.documentApiUrl}/default/media_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "DELETE",
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa media delete error: ${error.message || response.statusText}`
      );
    }
  }

  async updateMediaDocument(
    id: string,
    fields: Partial<MediaDocument>
  ): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/media_document/docid/${id}`;

    const updates: VespaMediaUpdatePayload = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        const typedKey = key as keyof MediaDocument;
        (updates as Record<keyof MediaDocument, { assign: unknown }>)[
          typedKey
        ] = { assign: value };
      }
    }

    const response = await fetch(documentPath, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: updates }),
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa media update error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as FeedResponse;
  }

  async getMediaDocument(id: string): Promise<MediaDocument | null> {
    const documentPath = `${this.documentApiUrl}/default/media_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa media get error: ${error.message || response.statusText}`
      );
    }

    const result = (await response.json()) as { fields: MediaDocument };
    return result.fields;
  }

  async feedSpreadsheetDocument(
    doc: SpreadsheetDocument,
    retries = 3
  ): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/spreadsheet_document/docid/${doc.id}`;

    const vespaDoc: VespaSpreadsheetDocumentForFeed = {
      ...doc,
      metadata: doc.metadata ? JSON.stringify(doc.metadata) : undefined,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(documentPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: vespaDoc }),
          signal: AbortSignal.timeout(60_000),
          // @ts-expect-error undici dispatcher type
          dispatcher: this.agent,
        });

        if (!response.ok) {
          const errorMessage = await this.getResponseError(response);
          throw new Error(`Vespa spreadsheet feed error: ${errorMessage}`);
        }

        return (await response.json()) as FeedResponse;
      } catch (error: unknown) {
        const shouldRetry = this.isRetryableError(error) && attempt < retries;

        if (shouldRetry) {
          const delay = 2 ** attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to feed spreadsheet document after retries");
  }

  async querySpreadsheets<T = SpreadsheetDocument>(
    params: SpreadsheetQueryParams
  ): Promise<SearchResult<T>> {
    const timeout = normalizeVespaTimeout(params.timeout);
    const body = {
      yql: params.yql,
      hits: params.hits ?? 20,
      offset: params.offset ?? 0,
      "ranking.profile": params.ranking,
      timeout,
      "input.query(query_embedding)": params.query_embedding,
    };

    const response = await fetch(this.searchApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa spreadsheet query error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as SearchResult<T>;
  }

  async deleteSpreadsheetDocument(id: string): Promise<void> {
    const documentPath = `${this.documentApiUrl}/default/spreadsheet_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "DELETE",
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa spreadsheet delete error: ${error.message || response.statusText}`
      );
    }
  }

  async getSpreadsheetDocument(
    id: string
  ): Promise<SpreadsheetDocument | null> {
    const documentPath = `${this.documentApiUrl}/default/spreadsheet_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error undici dispatcher type
      dispatcher: this.agent,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa spreadsheet get error: ${error.message || response.statusText}`
      );
    }

    const result = (await response.json()) as { fields: SpreadsheetDocument };
    return result.fields;
  }

  searchSpreadsheetsByTeam(
    teamId: string,
    query?: string,
    options?: { hits?: number; offset?: number }
  ): Promise<SearchResult<SpreadsheetDocument>> {
    let yql = `select * from spreadsheet_document where team_id contains "${escapeYqlString(teamId)}"`;

    if (query) {
      yql += ` and (title contains "${escapeYqlString(query)}" or content_summary contains "${escapeYqlString(query)}" or column_names contains "${escapeYqlString(query)}")`;
    }

    yql += " order by updated_at desc";

    return this.querySpreadsheets<SpreadsheetDocument>({
      yql,
      hits: options?.hits ?? 20,
      offset: options?.offset ?? 0,
      ranking: "bm25",
    });
  }

  findQueryableSpreadsheets(
    teamId: string,
    options?: { hits?: number }
  ): Promise<SearchResult<SpreadsheetDocument>> {
    const yql = `select * from spreadsheet_document where team_id contains "${escapeYqlString(teamId)}" and is_queryable = true order by updated_at desc`;

    return this.querySpreadsheets<SpreadsheetDocument>({
      yql,
      hits: options?.hits ?? 100,
      ranking: "bm25",
    });
  }

  private computeAclUpdate(
    currentAcl: string[],
    userId: string,
    action: "add" | "remove"
  ): string[] | null {
    if (action === "add") {
      if (currentAcl.includes(userId)) {
        return null;
      }
      return [...currentAcl, userId];
    }
    if (!currentAcl.includes(userId)) {
      return null;
    }
    return currentAcl.filter((id) => id !== userId);
  }

  private async applyAclUpdates(
    updates: Array<{ id: string; newAcl: string[] }>,
    concurrency: number
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < updates.length; i += concurrency) {
      const batch = updates.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(({ id, newAcl }) =>
          this.updateDocument(id, { access_control: newAcl })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          succeeded += 1;
        } else {
          failed += 1;
        }
      }
    }

    return { succeeded, failed };
  }

  async queryByThreadId<T = GenericDocument>(
    threadId: string,
    connectorId: string,
    options?: { hits?: number }
  ): Promise<SearchResult<T>> {
    const yql = `select * from openplane_document where thread_id contains "${escapeYqlString(threadId)}" and connector_id contains "${escapeYqlString(connectorId)}" order by created_at asc`;

    return await this.query<T>({
      yql,
      hits: options?.hits ?? 100,
    });
  }

  async queryByParentId<T = GenericDocument>(
    parentId: string,
    connectorId: string,
    options?: { hits?: number }
  ): Promise<SearchResult<T>> {
    const yql = `select * from openplane_document where parent_id contains "${escapeYqlString(parentId)}" and connector_id contains "${escapeYqlString(connectorId)}" order by created_at asc`;

    return await this.query<T>({
      yql,
      hits: options?.hits ?? 100,
    });
  }

  async updateChannelPermissions(
    connectorId: string,
    channelId: string,
    userId: string,
    action: "add" | "remove"
  ): Promise<{ updated: number }> {
    const sourceIdFilter = `${connectorId}_${channelId}`;
    const baseYql = `select id, access_control from openplane_document where source_id contains "${escapeYqlString(sourceIdFilter)}"`;

    let updated = 0;
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const results = await this.query<GenericDocument>({
        yql: baseYql,
        hits: pageSize,
        offset,
      });

      const hits = results.root?.children ?? [];
      if (hits.length === 0) {
        break;
      }

      const updates: Array<{ id: string; newAcl: string[] }> = [];
      for (const hit of hits) {
        const doc = hit.fields;
        if (!doc) {
          continue;
        }
        const newAcl = this.computeAclUpdate(
          doc.access_control ?? [],
          userId,
          action
        );
        if (newAcl) {
          updates.push({ id: doc.id, newAcl });
        }
      }

      const aclResult = await this.applyAclUpdates(updates, 10);
      updated += aclResult.succeeded;

      if (hits.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return { updated };
  }
}

export const vespaClient = new VespaClient();

async function safeReadResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function safeParseVespaError(text: string): Partial<VespaError> | null {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as Partial<VespaError>;
  } catch {
    return null;
  }
}

function truncateForLog(text: string, max = 4000): string {
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max)}…(truncated)` : text;
}

const RE_TIMEOUT_NUMBER = /^\d+(\.\d+)?$/;
const RE_TIMEOUT_MS = /^(\d+(\.\d+)?)ms$/;
const RE_TIMEOUT_S = /^(\d+(\.\d+)?)s$/;

function normalizeVespaTimeout(
  timeout: string | undefined
): string | undefined {
  if (!timeout) {
    return;
  }

  const t = timeout.trim().toLowerCase();
  if (!t) {
    return;
  }

  if (RE_TIMEOUT_NUMBER.test(t)) {
    return t;
  }

  const msMatch = t.match(RE_TIMEOUT_MS);
  if (msMatch) {
    const ms = Number(msMatch[1]);
    if (Number.isFinite(ms)) {
      return String(ms / 1000);
    }
  }

  const sMatch = t.match(RE_TIMEOUT_S);
  if (sMatch) {
    return sMatch[1];
  }

  return;
}
