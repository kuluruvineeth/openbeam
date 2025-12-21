import { embedQuery, getConfig as getAIConfig } from "@openplane/ai";
import {
  buildMediaVectorQueryFeatures,
  buildVectorQueryFeatures,
  type GenericDocument,
  type JsonObject,
  type MediaDocument,
  type MediaQueryParams,
  type QueryParams,
  type SearchResult as VespaSearchResult,
  vespaClient,
} from "@openplane/vespa";
import { getOrGenerateEmbedding } from "../ai/embedding-cache";
import { logger } from "../lib/logger";
import type {
  AuthorSearchParams,
  DocumentSearchResult,
  MediaSearchParams,
  MediaSearchResult,
  RecentDocumentsParams,
  ScoredMedia,
  SearchParams,
  SearchScoredDocument,
  SimilarDocumentsParams,
  ThreadSearchParams,
  UnifiedSearchItem,
  UnifiedSearchParams,
  UnifiedSearchResult,
} from "./types";

type ScoredSearchResult = {
  documents: SearchScoredDocument[];
  total: number;
  embeddingTime?: number;
};

type ScoredMediaSearchResult = {
  media: ScoredMedia[];
  total: number;
  embeddingTime?: number;
};

function escapeYqlString(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

export class SearchService {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This is a complex search query
  async search(params: SearchParams): Promise<DocumentSearchResult> {
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
      logger.error({ error }, "Search error");
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

  private async searchMediaWithScores(
    params: MediaSearchParams
  ): Promise<ScoredMediaSearchResult> {
    logger.debug(
      { query: params.query, teamId: params.teamId, limit: params.limit },
      "searchMediaWithScores starting"
    );

    try {
      const debugYql = `select * from media_document where team_id contains "${escapeYqlString(params.teamId)}" limit 5`;
      const debugResult = await vespaClient.queryMedia({
        yql: debugYql,
        hits: 5,
      });
      const debugCount = debugResult.root.fields?.totalCount ?? 0;
      logger.debug(
        {
          totalCount: debugCount,
          titles: debugResult.root.children
            ?.map((c) => c.fields.title)
            .slice(0, 3),
          accessControl: debugResult.root.children
            ?.map((c) => ({
              title: c.fields.title,
              is_public: c.fields.is_public,
              access_control: c.fields.access_control,
            }))
            .slice(0, 3),
          requestedAcl: params.accessControlIds,
        },
        "searchMediaWithScores DEBUG: Total media for team (no ACL)"
      );
    } catch (e) {
      logger.debug({ error: e }, "searchMediaWithScores DEBUG query failed");
    }

    let embeddingTime: number | undefined;

    const ranking = params.ranking || "hybrid";
    const useSemanticSearch = ranking === "hybrid" || ranking === "semantic";

    let mediaEmbedding: number[] | null = null;
    if (useSemanticSearch && params.query) {
      const embeddingStart = Date.now();
      mediaEmbedding = await this.getMediaQueryEmbedding(params.query);
      embeddingTime = Date.now() - embeddingStart;
      logger.debug(
        { hasEmbedding: mediaEmbedding !== null, embeddingTime },
        "searchMediaWithScores media embedding"
      );
    }

    const includeVectorSearch = useSemanticSearch && mediaEmbedding !== null;
    const effectiveRanking = includeVectorSearch ? ranking : "bm25";
    const yql = this.buildMediaSearchYQL(params, includeVectorSearch);

    logger.debug(
      { yql, ranking: effectiveRanking, includeVectorSearch },
      "searchMediaWithScores query"
    );

    const queryParams: MediaQueryParams = {
      yql,
      ranking: effectiveRanking,
      hits: params.limit || 20,
      offset: params.offset || 0,
      timeout: "5s",
      ...(includeVectorSearch && mediaEmbedding
        ? buildMediaVectorQueryFeatures(mediaEmbedding)
        : {}),
    };

    const vespaResult =
      await vespaClient.queryMedia<MediaDocument>(queryParams);

    const media = this.extractMediaWithScores(vespaResult);
    const total = vespaResult.root.fields?.totalCount ?? media.length;

    logger.debug(
      { mediaCount: media.length, total, firstMediaTitle: media[0]?.title },
      "searchMediaWithScores results"
    );

    return { media, total, embeddingTime };
  }

  private async getQueryEmbedding(query: string): Promise<number[] | null> {
    try {
      const aiConfig = getAIConfig();
      const modelId = aiConfig.defaultEmbeddingModel;

      return await getOrGenerateEmbedding(query, modelId, () =>
        embedQuery(query)
      );
    } catch (error) {
      logger.warn(
        { error },
        "Failed to generate query embedding, using BM25 only"
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

    if (params.sourceIds && params.sourceIds.length > 0) {
      const sourceConditions = params.sourceIds
        .map((id) => `source_id contains "${escapeYqlString(id)}"`)
        .join(" or ");
      conditions.push(`(${sourceConditions})`);
    } else if (params.sourceId) {
      pushContains("source_id", params.sourceId);
    }

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

  private extractMediaWithScores(
    result: VespaSearchResult<MediaDocument>
  ): Array<MediaDocument & { relevance: number }> {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => ({
      ...child.fields,
      metadata: this.parseMediaMetadata(child.fields.metadata),
      relevance: child.relevance,
    }));
  }

  private parseMediaMetadata(
    metadata: MediaDocument["metadata"]
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

  async searchMedia(params: MediaSearchParams): Promise<MediaSearchResult> {
    const startTime = Date.now();
    let embeddingTime: number | undefined;

    try {
      const ranking = params.ranking || "hybrid";
      const useSemanticSearch = ranking === "hybrid" || ranking === "semantic";

      let mediaEmbedding: number[] | null = null;
      if (useSemanticSearch && params.query) {
        const embeddingStart = Date.now();
        mediaEmbedding = await this.getMediaQueryEmbedding(params.query);
        embeddingTime = Date.now() - embeddingStart;
      }

      const includeVectorSearch = useSemanticSearch && mediaEmbedding !== null;
      const effectiveRanking = includeVectorSearch ? ranking : "bm25";
      const yql = this.buildMediaSearchYQL(params, includeVectorSearch);

      const queryParams: MediaQueryParams = {
        yql,
        ranking: effectiveRanking,
        hits: params.limit || 20,
        offset: params.offset || 0,
        timeout: "5s",
        ...(includeVectorSearch && mediaEmbedding
          ? buildMediaVectorQueryFeatures(mediaEmbedding)
          : {}),
      };

      const vespaResult =
        await vespaClient.queryMedia<MediaDocument>(queryParams);

      const media = this.extractMediaDocuments(vespaResult);
      const total = vespaResult.root.fields?.totalCount ?? media.length;

      return {
        media,
        total,
        queryTime: Date.now() - startTime,
        embeddingTime,
      };
    } catch (error) {
      logger.error({ error }, "Media search error");
      throw new Error(
        `Media search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async searchUnified(
    params: UnifiedSearchParams
  ): Promise<UnifiedSearchResult> {
    logger.debug(
      {
        query: params.query,
        teamId: params.teamId,
        includeDocuments: params.includeDocuments,
        includeMedia: params.includeMedia,
        limit: params.limit,
      },
      "searchUnified starting"
    );

    const startTime = Date.now();
    const includeDocuments = params.includeDocuments ?? true;
    const includeMedia = params.includeMedia ?? true;

    const [docResults, mediaResults] = await Promise.all([
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
            sourceTypes: params.sourceTypes,
            statuses: params.statuses,
            priorities: params.priorities,
            labels: params.labels,
            sourceId: params.sourceId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            ranking: params.ranking,
          })
        : Promise.resolve(null),
      includeMedia
        ? this.searchMediaWithScores({
            query: params.query,
            teamId: params.teamId,
            limit: params.limit,
            offset: params.offset,
            accessControlIds: params.accessControlIds,
            connectorId: params.connectorId,
            sourceId: params.sourceId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            ranking: params.mediaRanking,
          })
        : Promise.resolve(null),
    ]);

    const scoredDocuments = docResults?.documents || [];
    const scoredMedia = mediaResults?.media || [];
    const documentTotal = docResults?.total || 0;
    const mediaTotal = mediaResults?.total || 0;

    logger.debug(
      {
        documentCount: scoredDocuments.length,
        mediaCount: scoredMedia.length,
        documentTotal,
        mediaTotal,
      },
      "searchUnified results summary"
    );

    const items: UnifiedSearchItem[] = [
      ...scoredDocuments.map((doc) => ({
        type: "document" as const,
        data: doc,
        relevance: doc.relevance,
      })),
      ...scoredMedia.map((media) => ({
        type: "media" as const,
        data: media,
        relevance: media.relevance,
      })),
    ].sort((a, b) => b.relevance - a.relevance);

    return {
      items,
      documents: scoredDocuments,
      media: scoredMedia,
      documentTotal,
      mediaTotal,
      total: documentTotal + mediaTotal,
      queryTime: Date.now() - startTime,
      embeddingTime:
        (docResults?.embeddingTime || 0) + (mediaResults?.embeddingTime || 0),
    };
  }

  private async getMediaQueryEmbedding(
    query: string
  ): Promise<number[] | null> {
    try {
      const hasApiKey = !!process.env.TWELVELABS_API_KEY;
      logger.debug(
        { hasApiKey, query },
        "getMediaQueryEmbedding checking TwelveLabs"
      );

      if (!hasApiKey) {
        logger.debug(
          "getMediaQueryEmbedding: No TWELVELABS_API_KEY, using BM25 only"
        );
        return null;
      }

      const { TwelveLabsClient } = await import("@openplane/media");
      const client = new TwelveLabsClient();
      const embedding = await client.embedText(query);
      logger.debug(
        { embeddingLength: embedding?.length },
        "getMediaQueryEmbedding got embedding"
      );
      return embedding;
    } catch (error) {
      logger.warn({ error }, "getMediaQueryEmbedding failed");
      return null;
    }
  }

  private buildMediaSearchYQL(
    params: MediaSearchParams,
    includeVectorSearch: boolean
  ): string {
    const conditions: string[] = [];
    const limit = params.limit || 20;

    conditions.push(`team_id contains "${escapeYqlString(params.teamId)}"`);

    if (includeVectorSearch && params.query) {
      const vectorClause = `({targetHits:${limit * 2}}nearestNeighbor(segment_embeddings, media_embedding))`;
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

    if (params.mediaType) {
      conditions.push(
        `media_type contains "${escapeYqlString(params.mediaType)}"`
      );
    }

    conditions.push(this.buildAccessControlClause(params.accessControlIds));

    return `select * from media_document where ${conditions.join(" and ")}`;
  }

  private extractMediaDocuments(
    result: VespaSearchResult<MediaDocument>
  ): MediaDocument[] {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => ({
      ...child.fields,
      metadata: this.parseMediaMetadata(child.fields.metadata),
    }));
  }
}

export const searchService = new SearchService();
