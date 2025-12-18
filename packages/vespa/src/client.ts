import type {
  Entity,
  FeedResponse,
  GenericDocument,
  MediaDocument,
  MediaQueryParams,
  QueryParams,
  SearchResult,
  VespaEmbeddingCell,
  VespaError,
  VespaGenericDocumentForFeed,
  VespaMediaDocumentForFeed,
  VespaMediaQueryBody,
  VespaMediaUpdatePayload,
  VespaQueryBody,
  VespaTimestampCell,
} from "./schemas";

export class VespaClient {
  private readonly baseUrl: string;
  private readonly documentApiUrl: string;
  private readonly searchApiUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.VESPA_URL || "http://localhost:8080";
    this.documentApiUrl = `${this.baseUrl}/document/v1`;
    this.searchApiUrl = `${this.baseUrl}/search/`;
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

  async feedBatch(docs: GenericDocument[]): Promise<FeedResponse[]> {
    const results: FeedResponse[] = [];

    const batchSize = 10;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (doc) => {
          try {
            const response = await this.feedDocument(doc);
            return response;
          } catch (error) {
            console.error("Vespa document feed failure:", {
              error,
              docId: doc.id,
            });
            throw error;
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  async feedEntity(entity: Entity): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/entity/docid/${entity.id}`;

    const response = await fetch(documentPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: entity }),
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
    const hasVectorFeatures = !!params.query_embedding;

    if (hasVectorFeatures) {
      const body: VespaQueryBody = {
        yql: params.yql,
        hits: params.hits ?? 20,
        offset: params.offset ?? 0,
        "ranking.profile": params.ranking,
        timeout: params.timeout,
        "input.query(query_embedding)": params.query_embedding,
        "input.query(title_embedding)": params.title_embedding,
        "input.query(topic_embedding)": params.topic_embedding,
        "input.query(user_dept_embedding)": params.user_dept_embedding,
      };

      const response = await fetch(this.searchApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = (await response.json()) as VespaError;
        throw new Error(
          `Vespa query error: ${error.message || response.statusText}`
        );
      }

      return (await response.json()) as SearchResult<T>;
    }

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
      queryParams.set("timeout", params.timeout);
    }

    const response = await fetch(`${this.searchApiUrl}?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa query error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as SearchResult<T>;
  }

  async deleteDocument(id: string): Promise<void> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "DELETE",
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
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa update error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as FeedResponse;
  }

  async getDocument(id: string): Promise<GenericDocument | null> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "GET",
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
      const response = await fetch(`${this.baseUrl}/ApplicationStatus`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async deleteByConnectorId(
    connectorId: string,
    schema: "openplane_document" | "media_document" | "entity"
  ): Promise<{ deleted: number }> {
    const selection = `${schema}.connector_id=="${connectorId}"`;
    const url = `${this.documentApiUrl}/default/${schema}/docid?selection=${encodeURIComponent(selection)}&cluster=content`;

    const response = await fetch(url, { method: "DELETE" });

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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor separately
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
    const body: VespaMediaQueryBody = {
      yql: params.yql,
      hits: params.hits ?? 20,
      offset: params.offset ?? 0,
      "ranking.profile": params.ranking,
      timeout: params.timeout,
      "input.query(media_embedding)": params.media_embedding,
      "input.query(query_embedding)": params.query_embedding,
      "input.query(topic_embedding)": params.topic_embedding,
    };

    const response = await fetch(this.searchApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
}

export const vespaClient = new VespaClient();
