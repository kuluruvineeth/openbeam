import { embedQuery, getConfig as getAIConfig } from "@openplane/ai";
import {
  buildVectorQueryFeatures,
  buildVideoVectorQueryFeatures,
  type GenericDocument,
  type JsonObject,
  type QueryParams,
  type SearchResult as VespaSearchResult,
  type VideoDocument,
  type VideoQueryParams,
  vespaClient,
} from "@openplane/vespa";
import { getOrGenerateEmbedding } from "../ai/embedding-cache";
import type {
  AuthorSearchParams,
  RecentDocumentsParams,
  ScoredDocument,
  ScoredVideo,
  SearchParams,
  SearchResult,
  SimilarDocumentsParams,
  ThreadSearchParams,
  UnifiedSearchItem,
  UnifiedSearchParams,
  UnifiedSearchResult,
  VideoSearchParams,
  VideoSearchResult,
} from "./types";

type ScoredSearchResult = {
  documents: ScoredDocument[];
  total: number;
  embeddingTime?: number;
};

type ScoredVideoSearchResult = {
  videos: ScoredVideo[];
  total: number;
  embeddingTime?: number;
};

function escapeYqlString(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

export class SearchService {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: search logic is inherently complex
  async search(params: SearchParams): Promise<SearchResult> {
    const startTime = Date.now();
    let embeddingTime: number | undefined;

    try {
      const ranking = params.ranking || "hybrid";
      const useSemanticSearch = ranking === "hybrid" || ranking === "semantic";

      let queryEmbeddingFeatures: Pick<QueryParams, "query_embedding"> | null =
        null;
      if (useSemanticSearch && params.query) {
        const embeddingStart = Date.now();
        const queryEmbedding = await this.getQueryEmbedding(params.query);
        embeddingTime = Date.now() - embeddingStart;

        if (queryEmbedding) {
          queryEmbeddingFeatures = buildVectorQueryFeatures(queryEmbedding);
        }
      }

      const includeVectorSearch =
        useSemanticSearch && queryEmbeddingFeatures !== null;
      const effectiveRanking = includeVectorSearch ? ranking : "bm25";
      const yql = this.buildSearchYQL(params, includeVectorSearch);

      const vespaResult = await vespaClient.query({
        yql,
        ranking: effectiveRanking,
        hits: params.limit || 20,
        offset: params.offset || 0,
        timeout: "5s",
        ...(queryEmbeddingFeatures ?? {}),
      });

      const documents = this.extractDocuments(vespaResult);

      const total = vespaResult.root.fields?.totalCount ?? documents.length;

      const queryTime = Date.now() - startTime;

      return {
        documents,
        total,
        limit: params.limit || 20,
        offset: params.offset || 0,
        hasMore: (params.offset || 0) + documents.length < total,
        queryTime,
        embeddingTime,
      };
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async searchWithScores(
    params: SearchParams
  ): Promise<ScoredSearchResult> {
    let embeddingTime: number | undefined;

    const ranking = params.ranking || "hybrid";
    const useSemanticSearch = ranking === "hybrid" || ranking === "semantic";

    let queryEmbeddingFeatures: Pick<QueryParams, "query_embedding"> | null =
      null;
    if (useSemanticSearch && params.query) {
      const embeddingStart = Date.now();
      const queryEmbedding = await this.getQueryEmbedding(params.query);
      embeddingTime = Date.now() - embeddingStart;

      if (queryEmbedding) {
        queryEmbeddingFeatures = buildVectorQueryFeatures(queryEmbedding);
      }
    }

    const includeVectorSearch =
      useSemanticSearch && queryEmbeddingFeatures !== null;
    const effectiveRanking = includeVectorSearch ? ranking : "bm25";
    const yql = this.buildSearchYQL(params, includeVectorSearch);

    const vespaResult = await vespaClient.query({
      yql,
      ranking: effectiveRanking,
      hits: params.limit || 20,
      offset: params.offset || 0,
      timeout: "5s",
      ...(queryEmbeddingFeatures ?? {}),
    });

    const documents = this.extractDocumentsWithScores(vespaResult);
    const total = vespaResult.root.fields?.totalCount ?? documents.length;

    return { documents, total, embeddingTime };
  }

  private async searchVideosWithScores(
    params: VideoSearchParams
  ): Promise<ScoredVideoSearchResult> {
    let embeddingTime: number | undefined;

    const ranking = params.ranking || "hybrid";
    const useSemanticSearch = ranking === "hybrid" || ranking === "semantic";

    let videoEmbedding: number[] | null = null;
    if (useSemanticSearch && params.query) {
      const embeddingStart = Date.now();
      videoEmbedding = await this.getVideoQueryEmbedding(params.query);
      embeddingTime = Date.now() - embeddingStart;
    }

    const includeVectorSearch = useSemanticSearch && videoEmbedding !== null;
    const effectiveRanking = includeVectorSearch ? ranking : "bm25";
    const yql = this.buildVideoSearchYQL(params, includeVectorSearch);

    const queryParams: VideoQueryParams = {
      yql,
      ranking: effectiveRanking,
      hits: params.limit || 20,
      offset: params.offset || 0,
      timeout: "5s",
      ...(includeVectorSearch && videoEmbedding
        ? buildVideoVectorQueryFeatures(videoEmbedding)
        : {}),
    };

    const vespaResult = await vespaClient.queryVideos(queryParams);

    const videos = this.extractVideosWithScores(vespaResult);
    const total = vespaResult.root.fields?.totalCount ?? videos.length;

    return { videos, total, embeddingTime };
  }

  private async getQueryEmbedding(query: string): Promise<number[] | null> {
    try {
      const aiConfig = getAIConfig();
      const modelId = aiConfig.defaultEmbeddingModel;

      return await getOrGenerateEmbedding(query, modelId, () =>
        embedQuery(query)
      );
    } catch (error) {
      console.warn(
        "Failed to generate query embedding, using BM25 only:",
        error
      );
      return null;
    }
  }

  async searchThread(params: ThreadSearchParams): Promise<GenericDocument[]> {
    const { threadId, teamId, accessControlIds } = params;

    const yql = `select * from openplane_document where thread_id contains "${escapeYqlString(
      threadId
    )}" and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at asc`;

    const result = await vespaClient.query({
      yql,
      ranking: "bm25",
      hits: 100,
    });

    return this.extractDocuments(result);
  }

  async findSimilar(
    params: SimilarDocumentsParams
  ): Promise<GenericDocument[]> {
    const { documentId, teamId, limit = 10, accessControlIds } = params;

    const doc = await vespaClient.getDocument(documentId);
    if (!doc?.content_embedding) {
      throw new Error("Document not found or has no embedding");
    }

    if (!this.isDocumentAccessible(doc, accessControlIds)) {
      throw new Error("Document not accessible");
    }

    const yql = `select * from openplane_document where ({targetHits:${limit * 2}}nearestNeighbor(content_embedding, query_embedding)) and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(accessControlIds)} and id != "${escapeYqlString(documentId)}"`;

    const vectorFeatures = buildVectorQueryFeatures(doc.content_embedding);

    const result = await vespaClient.query({
      yql,
      ranking: "semantic",
      hits: limit,
      ...vectorFeatures,
    });

    return this.extractDocuments(result);
  }

  async getRecentDocuments(
    params: RecentDocumentsParams
  ): Promise<GenericDocument[]> {
    const { teamId, hours = 24, limit = 20, accessControlIds } = params;
    const fromDate = Date.now() - hours * 60 * 60 * 1000;

    const yql = `select * from openplane_document where team_id contains "${escapeYqlString(
      teamId
    )}" and created_at >= ${fromDate} and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at desc`;

    const result = await vespaClient.query({
      yql,
      ranking: "recency",
      hits: limit,
    });

    return this.extractDocuments(result);
  }

  async searchByAuthor(params: AuthorSearchParams): Promise<GenericDocument[]> {
    const { authorId, teamId, limit = 50, accessControlIds } = params;

    const yql = `select * from openplane_document where author_id contains "${escapeYqlString(
      authorId
    )}" and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at desc`;

    const result = await vespaClient.query({
      yql,
      ranking: "bm25",
      hits: limit,
    });

    return this.extractDocuments(result);
  }

  private buildSearchYQL(
    params: SearchParams,
    includeVectorSearch = false
  ): string {
    const conditions: string[] = [];
    const limit = params.limit || 20;

    const pushContains = (field: string, value?: string) => {
      if (!value) {
        return;
      }
      conditions.push(`${field} contains "${escapeYqlString(value)}"`);
    };

    const pushContainsAny = (field: string, values?: string[]) => {
      if (!values || values.length === 0) {
        return;
      }
      const safeValues = values.filter(Boolean);
      if (safeValues.length === 0) {
        return;
      }
      if (safeValues.length === 1) {
        conditions.push(
          `${field} contains "${escapeYqlString(safeValues[0]?.toLowerCase() ?? "")}"`
        );
      } else {
        const orConditions = safeValues
          .map((v) => `${field} contains "${escapeYqlString(v.toLowerCase())}"`)
          .join(" or ");
        conditions.push(`(${orConditions})`);
      }
    };

    pushContains("team_id", params.teamId);

    if (includeVectorSearch && params.query) {
      const vectorClause = `({targetHits:${limit * 2}}nearestNeighbor(content_embedding, query_embedding))`;
      const textClause = `default contains "${escapeYqlString(params.query)}"`;
      conditions.push(`(${vectorClause} or (${textClause}))`);
    } else if (params.query) {
      conditions.push(`(default contains "${escapeYqlString(params.query)}")`);
    }

    pushContainsAny("connector_type", params.connectorTypes);
    pushContainsAny("document_type", params.documentTypes);
    pushContainsAny("source_type", params.sourceTypes);
    pushContainsAny("status", params.statuses);
    pushContainsAny("priority", params.priorities);

    if (params.labels && params.labels.length > 0) {
      const labelConditions = params.labels
        .map((l) => `labels contains "${escapeYqlString(l)}"`)
        .join(" or ");
      conditions.push(`(${labelConditions})`);
    }

    pushContains("connector_id", params.connectorId);
    pushContains("author_id", params.authorId);
    pushContains("source_id", params.sourceId);

    if (params.fromDate) {
      conditions.push(`created_at >= ${params.fromDate}`);
    }
    if (params.toDate) {
      conditions.push(`created_at <= ${params.toDate}`);
    }

    conditions.push(this.buildAccessControlClause(params.accessControlIds));

    const whereClause = conditions.join(" and ");
    return `select * from openplane_document where ${whereClause}`;
  }

  private buildAccessControlClause(accessControlIds?: string[]): string {
    if (accessControlIds && accessControlIds.length > 0) {
      const aclConditions = accessControlIds
        .map(
          (identifier) =>
            `access_control contains "${escapeYqlString(identifier)}"`
        )
        .join(" or ");
      return `(is_public = true or (${aclConditions}))`;
    }

    return "is_public = true";
  }

  private isDocumentAccessible(
    doc: GenericDocument | null | undefined,
    accessControlIds?: string[]
  ): boolean {
    if (!doc) {
      return false;
    }

    if (doc.is_public) {
      return true;
    }

    if (!doc.access_control || doc.access_control.length === 0) {
      return false;
    }

    if (!accessControlIds || accessControlIds.length === 0) {
      return false;
    }

    return doc.access_control.some((id) => accessControlIds.includes(id));
  }

  private extractDocuments(
    result: VespaSearchResult<GenericDocument>
  ): GenericDocument[] {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => child.fields);
  }

  private extractDocumentsWithScores(
    result: VespaSearchResult<GenericDocument>
  ): Array<GenericDocument & { relevance: number }> {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => ({
      ...child.fields,
      relevance: child.relevance,
    }));
  }

  private extractVideosWithScores(
    result: VespaSearchResult<VideoDocument>
  ): Array<VideoDocument & { relevance: number }> {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => ({
      ...child.fields,
      metadata: this.parseVideoMetadata(child.fields.metadata),
      relevance: child.relevance,
    }));
  }

  private parseVideoMetadata(
    metadata: VideoDocument["metadata"]
  ): JsonObject | undefined {
    if (!metadata) {
      return;
    }
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata) as JsonObject;
      } catch {
        return;
      }
    }
    return metadata;
  }

  async searchVideos(params: VideoSearchParams): Promise<VideoSearchResult> {
    const startTime = Date.now();
    let embeddingTime: number | undefined;

    try {
      const ranking = params.ranking || "hybrid";
      const useSemanticSearch = ranking === "hybrid" || ranking === "semantic";

      let videoEmbedding: number[] | null = null;
      if (useSemanticSearch && params.query) {
        const embeddingStart = Date.now();
        videoEmbedding = await this.getVideoQueryEmbedding(params.query);
        embeddingTime = Date.now() - embeddingStart;
      }

      const includeVectorSearch = useSemanticSearch && videoEmbedding !== null;
      const effectiveRanking = includeVectorSearch ? ranking : "bm25";
      const yql = this.buildVideoSearchYQL(params, includeVectorSearch);

      const queryParams: VideoQueryParams = {
        yql,
        ranking: effectiveRanking,
        hits: params.limit || 20,
        offset: params.offset || 0,
        timeout: "5s",
        ...(includeVectorSearch && videoEmbedding
          ? buildVideoVectorQueryFeatures(videoEmbedding)
          : {}),
      };

      const vespaResult = await vespaClient.queryVideos(queryParams);

      const videos = this.extractVideoDocuments(vespaResult);
      const total = vespaResult.root.fields?.totalCount ?? videos.length;

      return {
        videos,
        total,
        queryTime: Date.now() - startTime,
        embeddingTime,
      };
    } catch (error) {
      console.error("Video search error:", error);
      throw new Error(
        `Video search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async searchUnified(
    params: UnifiedSearchParams
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const includeDocuments = params.includeDocuments ?? true;
    const includeVideos = params.includeVideos ?? true;

    const [docResults, videoResults] = await Promise.all([
      includeDocuments
        ? this.searchWithScores({
            query: params.query,
            teamId: params.teamId,
            limit: params.limit,
            offset: params.offset,
            accessControlIds: params.accessControlIds,
            connectorTypes: params.connectorTypes,
            connectorId: params.connectorId,
            documentTypes: params.documentTypes,
            sourceId: params.sourceId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            ranking: params.ranking,
          })
        : Promise.resolve(null),
      includeVideos
        ? this.searchVideosWithScores({
            query: params.query,
            teamId: params.teamId,
            limit: params.limit,
            offset: params.offset,
            accessControlIds: params.accessControlIds,
            connectorId: params.connectorId,
            sourceId: params.sourceId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            ranking: params.videoRanking,
          })
        : Promise.resolve(null),
    ]);

    const scoredDocuments = docResults?.documents || [];
    const scoredVideos = videoResults?.videos || [];
    const documentTotal = docResults?.total || 0;
    const videoTotal = videoResults?.total || 0;

    // Merge documents and videos by relevance score
    const items: UnifiedSearchItem[] = [
      ...scoredDocuments.map((doc) => ({
        type: "document" as const,
        data: doc,
        relevance: doc.relevance,
      })),
      ...scoredVideos.map((video) => ({
        type: "video" as const,
        data: video,
        relevance: video.relevance,
      })),
    ].sort((a, b) => b.relevance - a.relevance);

    return {
      items,
      documents: scoredDocuments,
      videos: scoredVideos,
      documentTotal,
      videoTotal,
      total: documentTotal + videoTotal,
      queryTime: Date.now() - startTime,
      embeddingTime:
        (docResults?.embeddingTime || 0) + (videoResults?.embeddingTime || 0),
    };
  }

  private async getVideoQueryEmbedding(
    query: string
  ): Promise<number[] | null> {
    try {
      if (!process.env.TWELVELABS_API_KEY) {
        return null;
      }

      const { TwelveLabsClient } = await import("@openplane/video");
      const client = new TwelveLabsClient();
      return await client.embedText(query);
    } catch (error) {
      console.warn("Failed to generate video query embedding:", error);
      return null;
    }
  }

  private buildVideoSearchYQL(
    params: VideoSearchParams,
    includeVectorSearch: boolean
  ): string {
    const conditions: string[] = [];
    const limit = params.limit || 20;

    conditions.push(`team_id contains "${escapeYqlString(params.teamId)}"`);

    if (includeVectorSearch && params.query) {
      const vectorClause = `({targetHits:${limit * 2}}nearestNeighbor(segment_embeddings, video_embedding))`;
      const textClause = `default contains "${escapeYqlString(params.query)}"`;
      conditions.push(`(${vectorClause} or (${textClause}))`);
    } else if (params.query) {
      conditions.push(`(default contains "${escapeYqlString(params.query)}")`);
    }

    if (params.connectorId) {
      conditions.push(
        `connector_id contains "${escapeYqlString(params.connectorId)}"`
      );
    }

    if (params.sourceId) {
      conditions.push(
        `source_id contains "${escapeYqlString(params.sourceId)}"`
      );
    }

    if (params.fromDate) {
      conditions.push(`created_at >= ${params.fromDate}`);
    }

    if (params.toDate) {
      conditions.push(`created_at <= ${params.toDate}`);
    }

    if (params.videoType) {
      conditions.push(
        `video_type contains "${escapeYqlString(params.videoType)}"`
      );
    }

    conditions.push(this.buildAccessControlClause(params.accessControlIds));

    return `select * from video_document where ${conditions.join(" and ")}`;
  }

  private extractVideoDocuments(
    result: VespaSearchResult<VideoDocument>
  ): VideoDocument[] {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => ({
      ...child.fields,
      metadata: this.parseVideoMetadata(child.fields.metadata),
    }));
  }
}

export const searchService = new SearchService();
