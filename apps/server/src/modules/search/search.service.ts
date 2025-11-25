/**
 * Enhanced Search Service
 * Business logic for search operations with facets and aggregations
 *
 * Uses @openplane/vespa clients and query builders for clean, type-safe operations.
 */

import {
  type DocumentSearchOptions,
  documentClient,
  type OpenPlaneDocument,
  type UnifiedSearchOptions,
  type VespaHit,
  searchService as vespaSearchService,
} from "@openplane/vespa";
import type {
  DocumentSummary,
  SearchAggregations,
  SearchFacets,
} from "@/types/api";

// ============================================================================
// Types
// ============================================================================

export interface SearchParams {
  query: string;
  teamId: string;
  accessControlIds?: string[];
  connectorTypes?: string[];
  connectorIds?: string[];
  documentTypes?: string[];
  authorIds?: string[];
  sourceIds?: string[];
  tags?: string[];
  fromDate?: number;
  toDate?: number;
  limit: number;
  offset: number;
  ranking: "bm25" | "semantic" | "hybrid" | "recency" | "engagement";
  includeSnippets?: boolean;
  snippetLength?: number;
  includeFacets?: boolean;
  includeAggregations?: boolean;
  groupByThread?: boolean;
}

export interface SearchResult {
  documents: DocumentSummary[];
  total: number;
  facets?: SearchFacets;
  aggregations?: SearchAggregations;
  suggestions?: string[];
  queryTime: number;
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
// Service Class
// ============================================================================

export class SearchService {
  /**
   * Main search with facets and aggregations
   * Uses @vespa documentClient for type-safe search
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const startTime = Date.now();

    // Build search options for documentClient
    const searchOptions: DocumentSearchOptions = {
      query: params.query,
      teamId: params.teamId,
      accessControl: params.accessControlIds,
      connectorId:
        params.connectorIds && params.connectorIds.length > 0
          ? params.connectorIds[0]
          : undefined,
      connectorType:
        params.connectorTypes && params.connectorTypes.length > 0
          ? params.connectorTypes[0]
          : undefined,
      documentType:
        params.documentTypes && params.documentTypes.length > 0
          ? params.documentTypes[0]
          : undefined,
      authorId:
        params.authorIds && params.authorIds.length > 0
          ? params.authorIds[0]
          : undefined,
      sourceId:
        params.sourceIds && params.sourceIds.length > 0
          ? params.sourceIds[0]
          : undefined,
      dateRange:
        params.fromDate || params.toDate
          ? { from: params.fromDate, to: params.toDate }
          : undefined,
      limit: params.limit,
      offset: params.offset,
      rankProfile: params.ranking,
    };

    // Execute search using documentClient
    const result = await documentClient.search(searchOptions);

    // Map results to DocumentSummary
    const documents = this.mapVespaHitsToSummaries(
      result.items,
      params.snippetLength
    );

    // Build facets if requested
    let facets: SearchFacets | undefined;
    if (params.includeFacets) {
      facets = await this.buildFacets(params);
    }

    // Build aggregations if requested
    let aggregations: SearchAggregations | undefined;
    if (params.includeAggregations) {
      aggregations = this.buildAggregations(documents, result.total);
    }

    // Get query suggestions using vespaSearchService
    let suggestions: string[] | undefined;
    if (params.query) {
      const suggestionResults = await vespaSearchService.getSuggestions(
        params.query,
        params.teamId,
        { limit: 5, types: ["document"] }
      );
      suggestions = suggestionResults.map((s) => s.text);
    }

    return {
      documents,
      total: result.total,
      facets,
      aggregations,
      suggestions,
      queryTime: Date.now() - startTime,
    };
  }

  /**
   * Autocomplete with multiple suggestion types
   * Uses vespaSearchService for unified suggestions
   */
  async autocomplete(
    prefix: string,
    teamId: string,
    options: {
      limit?: number;
      types?: string[];
      accessControlIds?: string[];
    } = {}
  ): Promise<AutocompleteSuggestion[]> {
    const {
      limit = 10,
      types = [],
      accessControlIds: _accessControlIds,
    } = options;
    // Map types to vespa types
    const vespaTypes =
      types.length > 0 ? this.mapSuggestionTypes(types) : undefined;

    // Use vespaSearchService for unified suggestions
    const suggestions = await vespaSearchService.getSuggestions(
      prefix,
      teamId,
      { limit, types: vespaTypes }
    );

    // Map to our format and add query suggestions
    const result: AutocompleteSuggestion[] = suggestions.map((s) => ({
      text: s.text,
      type: this.mapVespaSuggestionType(s.type),
      entityId: s.metadata?.id as string | undefined,
      icon: s.metadata?.avatar as string | undefined,
      url: s.metadata?.url as string | undefined,
      score: s.score,
    }));

    // Add a simple query suggestion if not enough results
    if (result.length < limit && (!types.length || types.includes("query"))) {
      result.push({
        text: prefix,
        type: "query",
        score: 0.5,
      });
    }

    return result.slice(0, limit);
  }

  /**
   * Get recent documents
   * Uses documentClient.getRecent for optimized query
   */
  async getRecentDocuments(
    teamId: string,
    options: {
      hours?: number;
      limit?: number;
      connectorTypes?: string[];
      documentTypes?: string[];
      accessControlIds?: string[];
    } = {}
  ): Promise<DocumentSummary[]> {
    const {
      hours = 24,
      limit = 20,
      connectorTypes,
      documentTypes,
      accessControlIds,
    } = options;
    // Use documentClient for simple recent query
    const connectorType =
      connectorTypes && connectorTypes.length > 0
        ? connectorTypes[0]
        : undefined;

    const results = await documentClient.getRecent(teamId, {
      hours,
      limit,
      connectorType,
    });

    // Filter by document types and access control if needed
    let filtered = results;

    if (documentTypes && documentTypes.length > 0) {
      filtered = filtered.filter((hit) =>
        documentTypes.includes(hit.fields.document_type || "")
      );
    }

    if (accessControlIds && accessControlIds.length > 0) {
      filtered = filtered.filter((hit) => {
        if (hit.fields.is_public) {
          return true;
        }
        const acl = hit.fields.access_control || [];
        return accessControlIds.some((id) => acl.includes(id));
      });
    }

    return this.mapVespaHitsToSummaries(filtered);
  }

  /**
   * Search within a thread
   * Uses documentClient.searchByThread
   */
  async searchThread(
    threadId: string,
    teamId: string,
    accessControlIds?: string[]
  ): Promise<{
    documents: DocumentSummary[];
    participants: Array<{ id: string; name: string; avatar?: string }>;
  }> {
    const results = await documentClient.searchByThread(threadId, teamId, {
      limit: 100,
    });

    // Filter by access control
    const filtered = this.filterByAccessControl(results, accessControlIds);
    const documents = this.mapVespaHitsToSummaries(filtered);

    // Extract unique participants
    const participantMap = new Map<
      string,
      { id: string; name: string; avatar?: string }
    >();
    for (const doc of documents) {
      if (doc.authorId && !participantMap.has(doc.authorId)) {
        participantMap.set(doc.authorId, {
          id: doc.authorId,
          name: doc.authorName || doc.authorId,
          avatar: doc.authorAvatar,
        });
      }
    }

    return {
      documents,
      participants: Array.from(participantMap.values()),
    };
  }

  /**
   * Find similar documents
   * Uses documentClient.getSimilar
   */
  async findSimilar(
    documentId: string,
    teamId: string,
    options: {
      limit?: number;
      minScore?: number;
      accessControlIds?: string[];
    } = {}
  ): Promise<{
    sourceDocument?: DocumentSummary;
    similarDocuments: Array<DocumentSummary & { similarityScore: number }>;
  }> {
    const { limit = 10, minScore, accessControlIds } = options;
    // Get source document
    const sourceDoc = await documentClient.get(documentId);

    if (!sourceDoc || sourceDoc.team_id !== teamId) {
      throw new Error("Document not found");
    }

    // Get similar documents
    const similarHits = await documentClient.getSimilar(documentId, teamId, {
      limit: limit + 5, // Get extra to account for filtering
    });

    // Map and filter
    const sourceDocument = this.mapDocumentToSummary(sourceDoc);
    const similarDocuments = this.filterByAccessControl(
      similarHits,
      accessControlIds
    )
      .slice(0, limit)
      .map((hit) => ({
        ...this.mapVespaHitToSummary(hit),
        similarityScore: hit.relevance || 0,
      }))
      .filter((d) => !minScore || d.similarityScore >= minScore);

    return { sourceDocument, similarDocuments };
  }

  /**
   * Search by author
   * Uses documentClient.getByAuthor
   */
  async searchByAuthor(
    authorId: string,
    teamId: string,
    options: {
      limit?: number;
      documentTypes?: string[];
      fromDate?: number;
      toDate?: number;
      accessControlIds?: string[];
    } = {}
  ): Promise<{
    documents: DocumentSummary[];
    documentTypeBreakdown: Array<{ type: string; count: number }>;
  }> {
    const {
      limit = 20,
      documentTypes,
      fromDate,
      toDate,
      accessControlIds,
    } = options;
    const result = await documentClient.getByAuthor(authorId, teamId, {
      limit: limit + 20, // Get extra for filtering
    });

    // Apply additional filters
    let filtered = this.filterByAccessControl(result.items, accessControlIds);

    if (documentTypes && documentTypes.length > 0) {
      filtered = filtered.filter((hit) =>
        documentTypes.includes(hit.fields.document_type || "")
      );
    }

    if (fromDate) {
      filtered = filtered.filter(
        (hit) => (hit.fields.created_at || 0) >= fromDate
      );
    }

    if (toDate) {
      filtered = filtered.filter(
        (hit) => (hit.fields.created_at || 0) <= toDate
      );
    }

    const documents = this.mapVespaHitsToSummaries(filtered.slice(0, limit));

    // Calculate document type breakdown
    const typeCount = new Map<string, number>();
    for (const doc of documents) {
      const count = typeCount.get(doc.documentType) || 0;
      typeCount.set(doc.documentType, count + 1);
    }

    const documentTypeBreakdown = Array.from(typeCount.entries()).map(
      ([type, count]) => ({ type, count })
    );

    return { documents, documentTypeBreakdown };
  }

  /**
   * Unified search across all content types
   * Uses vespaSearchService.search
   */
  async unifiedSearch(options: UnifiedSearchOptions) {
    return await vespaSearchService.search(options);
  }

  /**
   * Hybrid search combining text and semantic
   * Uses vespaSearchService.hybridSearch
   */
  async hybridSearch(
    query: string,
    embedding: number[],
    teamId: string,
    options?: { limit?: number; accessControl?: string[] }
  ) {
    return await vespaSearchService.hybridSearch(
      query,
      embedding,
      teamId,
      options
    );
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildFacets(_params: SearchParams): SearchFacets {
    // Use query builder to get faceted counts
    // In production, this would make aggregation queries
    // For now, return empty structure
    return {
      connectorTypes: [],
      documentTypes: [],
      authors: [],
      sources: [],
      dates: [],
    };
  }

  private buildAggregations(
    documents: DocumentSummary[],
    total: number
  ): SearchAggregations {
    // Calculate basic aggregations from results
    const avgScore =
      documents.length > 0
        ? documents.reduce((sum, d) => sum + (d.relevanceScore || 0), 0) /
          documents.length
        : 0;

    // Top authors
    const authorCount = new Map<string, { name: string; count: number }>();
    for (const doc of documents) {
      if (doc.authorId) {
        const existing = authorCount.get(doc.authorId);
        if (existing) {
          existing.count += 1;
        } else {
          authorCount.set(doc.authorId, {
            name: doc.authorName || doc.authorId,
            count: 1,
          });
        }
      }
    }

    return {
      totalDocuments: total,
      avgRelevanceScore: avgScore,
      topAuthors: Array.from(authorCount.entries())
        .map(([id, { name, count }]) => ({ id, name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topSources: [],
      activityOverTime: [],
    };
  }

  private mapSuggestionTypes(
    types: string[]
  ): ("document" | "person" | "code" | "entity")[] {
    const mapping: Record<string, "document" | "person" | "code" | "entity"> = {
      document: "document",
      person: "person",
      code: "code",
      entity: "entity",
    };
    return types
      .map((t) => mapping[t])
      .filter((t): t is "document" | "person" | "code" | "entity" => !!t);
  }

  private mapVespaSuggestionType(
    type: string
  ): "query" | "document" | "person" | "action" {
    const mapping: Record<string, "query" | "document" | "person" | "action"> =
      {
        document: "document",
        person: "person",
        code: "document",
        entity: "document",
        query: "query",
      };
    return mapping[type] || "document";
  }

  private filterByAccessControl(
    hits: VespaHit<OpenPlaneDocument>[],
    accessControlIds?: string[]
  ): VespaHit<OpenPlaneDocument>[] {
    if (!accessControlIds || accessControlIds.length === 0) {
      return hits.filter((hit) => hit.fields.is_public);
    }

    return hits.filter((hit) => {
      if (hit.fields.is_public) {
        return true;
      }
      const acl = hit.fields.access_control || [];
      return accessControlIds.some((id) => acl.includes(id));
    });
  }

  private mapVespaHitsToSummaries(
    hits: VespaHit<OpenPlaneDocument>[],
    snippetLength = 200
  ): DocumentSummary[] {
    return hits.map((hit) => this.mapVespaHitToSummary(hit, snippetLength));
  }

  private mapVespaHitToSummary(
    hit: VespaHit<OpenPlaneDocument>,
    snippetLength = 200
  ): DocumentSummary {
    return this.mapDocumentToSummary(hit.fields, hit.relevance, snippetLength);
  }

  private mapDocumentToSummary(
    fields: OpenPlaneDocument,
    relevance?: number,
    snippetLength = 200
  ): DocumentSummary {
    return {
      id: fields.id,
      title: fields.title || "Untitled",
      documentType: fields.document_type || "document",
      connectorType: fields.connector_type || "UNKNOWN",
      connectorId: fields.connector_id || "",
      url: fields.url,
      thumbnail: fields.thumbnail,
      snippet: this.generateSnippet(fields.content, snippetLength),
      authorId: fields.author_id,
      authorName: fields.author_name,
      authorAvatar: fields.author_avatar,
      createdAt: fields.created_at || Date.now(),
      updatedAt: fields.updated_at,
      accessControl: fields.access_control || [],
      isPublic: fields.is_public,
      relevanceScore: relevance,
    };
  }

  private generateSnippet(content?: string, maxLength = 200): string {
    if (!content) {
      return "";
    }
    const cleaned = content.replace(/\s+/g, " ").trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return `${cleaned.slice(0, maxLength)}...`;
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const searchService = new SearchService();
