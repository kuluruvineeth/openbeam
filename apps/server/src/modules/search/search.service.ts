import { type GenericDocument, vespaClient } from "@openplane/vespa";
import logger from "@/utils/logger";

/**
 * Search parameters for querying Vespa
 */
export interface SearchParams {
  query: string;
  teamId: string;
  connectorType?: string;
  connectorId?: string;
  documentType?: string;
  authorId?: string;
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
  ranking?: "bm25" | "semantic" | "hybrid" | "recency" | "engagement";
  accessControlIds?: string[];
}

/**
 * Search result with metadata
 */
export interface SearchResult {
  documents: GenericDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  queryTime: number;
}

/**
 * Search Service - Handles all search operations with Vespa
 */
export class SearchService {
  /**
   * Main search method - searches across all indexed documents
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Build YQL query with filters
      const yql = this.buildSearchYQL(params);

      // Execute search
      const vespaResult = await vespaClient.query({
        yql,
        ranking: params.ranking || "hybrid",
        hits: params.limit || 20,
        offset: params.offset || 0,
        timeout: "5s",
      });

      // Extract documents from Vespa response
      const documents = this.extractDocuments(vespaResult);

      // Calculate total count (Vespa returns this in coverage)
      const total =
        (vespaResult.root.fields?.totalCount as number | undefined) ||
        documents.length;

      const queryTime = Date.now() - startTime;

      return {
        documents,
        total,
        limit: params.limit || 20,
        offset: params.offset || 0,
        hasMore: (params.offset || 0) + documents.length < total,
        queryTime,
      };
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Search within a specific thread
   */
  async searchThread(
    threadId: string,
    teamId: string,
    accessControlIds?: string[]
  ): Promise<GenericDocument[]> {
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

  /**
   * Get similar documents using vector search
   */
  async findSimilar(
    documentId: string,
    teamId: string,
    limit = 10,
    accessControlIds?: string[]
  ): Promise<GenericDocument[]> {
    // First, get the document to extract its embedding
    const doc = await vespaClient.getDocument(documentId);
    if (!doc?.content_embedding) {
      throw new Error("Document not found or has no embedding");
    }

    if (!this.isDocumentAccessible(doc, accessControlIds)) {
      throw new Error("Document not accessible");
    }

    // Use vector similarity search
    const yql = `select * from openplane_document where {targetHits:${limit}}nearestNeighbor(content_embedding, query_embedding) and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(accessControlIds)}`;

    const result = await vespaClient.query({
      yql,
      ranking: "semantic",
      hits: limit,
    });

    return this.extractDocuments(result);
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(
    teamId: string,
    hours = 24,
    limit = 20,
    accessControlIds?: string[]
  ): Promise<GenericDocument[]> {
    const fromDate = Date.now() - hours * 60 * 60 * 1000;

    const yql = `select * from openplane_document where team_id contains "${escapeYqlString(
      teamId
    )}" and created_at >= ${fromDate} and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at desc limit ${limit}`;

    const result = await vespaClient.query({
      yql,
      ranking: "recency",
      hits: limit,
    });

    return this.extractDocuments(result);
  }

  /**
   * Search by author
   */
  async searchByAuthor(
    authorId: string,
    teamId: string,
    limit = 50,
    accessControlIds?: string[]
  ): Promise<GenericDocument[]> {
    const yql = `select * from openplane_document where author_id contains "${escapeYqlString(
      authorId
    )}" and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at desc limit ${limit}`;

    const result = await vespaClient.query({
      yql,
      ranking: "bm25",
      hits: limit,
    });

    return this.extractDocuments(result);
  }

  /**
   * Autocomplete search (prefix matching on title)
   */
  async autocomplete(
    prefix: string,
    teamId: string,
    limit = 10,
    accessControlIds?: string[]
  ): Promise<Array<{ id: string; title: string; documentType: string }>> {
    const yql = `select id, title, document_type from openplane_document where title contains "${escapeYqlString(
      prefix
    )}" and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(accessControlIds)} limit ${limit}`;

    const result = await vespaClient.query({
      yql,
      ranking: "bm25",
      hits: limit,
    });

    const children = result.root.children || [];
    return children.map((child) => ({
      id: child.fields.id as string,
      title: child.fields.title as string,
      documentType: child.fields.document_type as string,
    }));
  }

  /**
   * Build YQL query with all filters
   */
  private buildSearchYQL(params: SearchParams): string {
    const conditions: string[] = [];
    const pushContains = (field: string, value?: string) => {
      if (!value) {
        return;
      }
      conditions.push(`${field} contains "${escapeYqlString(value)}"`);
    };

    // Team filter (always required)
    pushContains("team_id", params.teamId);

    // Full-text search
    if (params.query) {
      conditions.push(`(default contains "${escapeYqlString(params.query)}")`);
    }

    // Connector and document filters
    pushContains("connector_type", params.connectorType);
    pushContains("connector_id", params.connectorId);
    pushContains("document_type", params.documentType);
    pushContains("author_id", params.authorId);
    pushContains("source_id", params.sourceId);

    // Date range filters
    if (params.fromDate) {
      conditions.push(`created_at >= ${params.fromDate}`);
    }
    if (params.toDate) {
      conditions.push(`created_at <= ${params.toDate}`);
    }

    conditions.push(this.buildAccessControlClause(params.accessControlIds));

    // Build final YQL
    const whereClause = conditions.join(" and ");
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    return `select * from openplane_document where ${whereClause} limit ${limit} offset ${offset}`;
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

  /**
   * Extract documents from Vespa result
   */
  private extractDocuments(result: {
    root: {
      children?: Array<{ fields: unknown }>;
    };
  }): GenericDocument[] {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => child.fields as GenericDocument);
  }
}

// Export singleton instance
export const searchService = new SearchService();

function escapeYqlString(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}
