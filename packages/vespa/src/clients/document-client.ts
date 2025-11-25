/**
 * Document Client
 *
 * Client for openplane_document schema operations.
 * Handles all document types: Slack messages, Drive files, Notion pages, etc.
 */

import type {
  DocumentInput,
  DocumentRankProfile,
  DocumentUpdate,
  OpenPlaneDocument,
  PaginatedResult,
  VespaHit,
} from "../types";
import { BaseVespaClient } from "./base-client";

const SCHEMA = "openplane_document";
const NAMESPACE = "default";

export interface DocumentSearchOptions {
  query?: string;
  teamId: string;
  connectorId?: string;
  connectorType?: string;
  documentType?: string;
  sourceId?: string;
  authorId?: string;
  parentId?: string;
  threadId?: string;
  projectId?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  accessControl?: string[];
  isPublic?: boolean;
  dateRange?: { from?: number; to?: number };
  limit?: number;
  offset?: number;
  rankProfile?: DocumentRankProfile;
  embedding?: number[];
}

export class DocumentClient extends BaseVespaClient {
  // === CRUD Operations ===

  /**
   * Index a document
   */
  async feed(doc: DocumentInput) {
    const fields = {
      ...doc,
      created_at: doc.created_at || Date.now(),
      updated_at: doc.updated_at || Date.now(),
      indexed_at: Date.now(),
    };

    return await this.feedToSchema(
      { schema: SCHEMA, namespace: NAMESPACE, docId: doc.id },
      fields
    );
  }

  /**
   * Bulk index documents
   */
  async feedBatch(
    docs: DocumentInput[],
    options: {
      concurrency?: number;
      onProgress?: (indexed: number, total: number) => void;
    } = {}
  ) {
    return await this.feedBatchItems(docs, (doc) => this.feed(doc), options);
  }

  /**
   * Get a document by ID
   */
  async get(id: string): Promise<OpenPlaneDocument | null> {
    return await this.getFromSchema<OpenPlaneDocument>(SCHEMA, NAMESPACE, id);
  }

  /**
   * Update a document
   */
  async update(id: string, fields: DocumentUpdate) {
    return await this.updateInSchema(SCHEMA, NAMESPACE, id, {
      ...fields,
      updated_at: fields.updated_at || Date.now(),
    });
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    return await this.deleteFromSchema(SCHEMA, NAMESPACE, id);
  }

  /**
   * Delete all documents for a connector
   */
  async deleteByConnector(connectorId: string): Promise<{ deleted: number }> {
    //TODO: In a real implementation, you'd use Vespa's visitor/selection API
    // For now, we'll return 0 as this requires a different approach
    await Promise.resolve();
    console.warn(
      `Bulk delete by connector ${connectorId} requires Vespa visitor API`
    );
    return { deleted: 0 };
  }

  // === Search Operations ===

  /**
   * Search documents with full options
   */
  async search(
    options: DocumentSearchOptions
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    const conditions = this.buildSearchConditions(options);
    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")}`;

    const queryFeatures: Record<string, unknown> = {};
    if (options.embedding && options.embedding.length > 0) {
      queryFeatures["input.query(query_embedding)"] = {
        type: `tensor<float>(x[${options.embedding.length}])`,
        values: options.embedding,
      };
    }

    const result = await this.query<OpenPlaneDocument>(yql, {
      ranking: options.rankProfile || "hybrid",
      hits: options.limit || 20,
      offset: options.offset || 0,
      queryFeatures:
        Object.keys(queryFeatures).length > 0 ? queryFeatures : undefined,
    });

    return this.buildPaginatedResult(result, options);
  }

  /**
   * Simple text search
   */
  async textSearch(
    query: string,
    teamId: string,
    options: { limit?: number; offset?: number; accessControl?: string[] } = {}
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    return await this.search({
      query,
      teamId,
      limit: options.limit,
      offset: options.offset,
      accessControl: options.accessControl,
      rankProfile: "bm25",
    });
  }

  /**
   * Semantic search using embeddings
   */
  async semanticSearch(
    embedding: number[],
    teamId: string,
    options: { limit?: number; accessControl?: string[] } = {}
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    const limit = options.limit || 20;
    const accessConditions = this.buildAccessConditions(options.accessControl);

    const yql = `select * from ${SCHEMA} where {targetHits:${limit}}nearestNeighbor(content_embedding, query_embedding) and team_id contains "${this.escape(teamId)}"${accessConditions ? ` and ${accessConditions}` : ""}`;

    const result = await this.query<OpenPlaneDocument>(yql, {
      ranking: "semantic",
      hits: limit,
      queryFeatures: {
        "input.query(query_embedding)": {
          type: `tensor<float>(x[${embedding.length}])`,
          values: embedding,
        },
      },
    });

    const items = result.root.children || [];
    const total = result.root.fields.totalCount;

    return {
      items,
      total,
      hasMore: items.length < total,
      offset: 0,
      limit,
    };
  }

  /**
   * Hybrid search (text + semantic)
   */
  async hybridSearch(
    query: string,
    embedding: number[],
    teamId: string,
    options: { limit?: number; offset?: number; accessControl?: string[] } = {}
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    return await this.search({
      query,
      teamId,
      embedding,
      limit: options.limit,
      offset: options.offset,
      accessControl: options.accessControl,
      rankProfile: "hybrid",
    });
  }

  /**
   * Search by thread (for message threads)
   */
  async searchByThread(
    threadId: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<OpenPlaneDocument>[]> {
    const yql = `select * from ${SCHEMA} where thread_id contains "${this.escape(threadId)}" and team_id contains "${this.escape(teamId)}" order by created_at asc limit ${options.limit || 100}`;

    const result = await this.query<OpenPlaneDocument>(yql);
    return result.root.children || [];
  }

  /**
   * Get recent documents
   */
  async getRecent(
    teamId: string,
    options: { hours?: number; limit?: number; connectorType?: string } = {}
  ): Promise<VespaHit<OpenPlaneDocument>[]> {
    const { hours = 24, limit = 50, connectorType } = options;
    const fromDate = Date.now() - hours * 60 * 60 * 1000;

    let yql = `select * from ${SCHEMA} where team_id contains "${this.escape(teamId)}" and created_at >= ${fromDate}`;

    if (connectorType) {
      yql += ` and connector_type contains "${this.escape(connectorType)}"`;
    }

    yql += ` order by created_at desc limit ${limit}`;

    const result = await this.query<OpenPlaneDocument>(yql);
    return result.root.children || [];
  }

  /**
   * Get similar documents
   */
  async getSimilar(
    documentId: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<OpenPlaneDocument>[]> {
    const doc = await this.get(documentId);
    if (!doc?.content_embedding) {
      return [];
    }

    const result = await this.semanticSearch(doc.content_embedding, teamId, {
      limit: (options.limit || 10) + 1, // +1 to exclude self
    });

    // Filter out the source document
    return result.items.filter((item) => item.fields.id !== documentId);
  }

  /**
   * Get documents by author
   */
  async getByAuthor(
    authorId: string,
    teamId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    return await this.search({
      teamId,
      authorId,
      limit: options.limit,
      offset: options.offset,
      rankProfile: "recency",
    });
  }

  // === Metrics Updates ===

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    const doc = await this.get(id);
    if (doc) {
      await this.update(id, {
        view_count: (doc.view_count || 0) + 1,
        last_accessed_at: Date.now(),
      });
    }
  }

  /**
   * Increment click count
   */
  async incrementClickCount(id: string): Promise<void> {
    const doc = await this.get(id);
    if (doc) {
      await this.update(id, {
        click_count: (doc.click_count || 0) + 1,
      });
    }
  }

  /**
   * Update popularity score
   */
  async updatePopularityScore(id: string, score: number): Promise<void> {
    await this.update(id, { popularity_score: score });
  }

  // === Helper Methods ===

  private buildSearchConditions(options: DocumentSearchOptions): string[] {
    const conditions: string[] = [];

    // Required: team filter
    conditions.push(`team_id contains "${this.escape(options.teamId)}"`);

    // Full-text search
    if (options.query) {
      conditions.push(`(default contains "${this.escape(options.query)}")`);
    }

    // Simple field filters - extracted to reduce complexity
    this.addFieldFilters(conditions, options);

    // Labels, date range, and access control
    this.addLabelsFilter(conditions, options.labels);
    this.addDateRangeFilter(conditions, options.dateRange);
    this.addAccessFilter(conditions, options.accessControl, options.isPublic);

    // Exclude deleted/archived by default
    conditions.push("(is_deleted = false or !is_deleted)");
    conditions.push("(is_archived = false or !is_archived)");

    return conditions;
  }

  private addFieldFilters(
    conditions: string[],
    options: DocumentSearchOptions
  ): void {
    const fieldMap: [keyof DocumentSearchOptions, string][] = [
      ["connectorId", "connector_id"],
      ["connectorType", "connector_type"],
      ["documentType", "document_type"],
      ["sourceId", "source_id"],
      ["authorId", "author_id"],
      ["parentId", "parent_id"],
      ["threadId", "thread_id"],
      ["projectId", "project_id"],
      ["status", "status"],
      ["priority", "priority"],
    ];

    for (const [optKey, field] of fieldMap) {
      const value = options[optKey];
      if (typeof value === "string" && value) {
        conditions.push(`${field} contains "${this.escape(value)}"`);
      }
    }
  }

  private addLabelsFilter(conditions: string[], labels?: string[]): void {
    if (labels && labels.length > 0) {
      const labelConditions = labels
        .map((l) => `labels contains "${this.escape(l)}"`)
        .join(" or ");
      conditions.push(`(${labelConditions})`);
    }
  }

  private addDateRangeFilter(
    conditions: string[],
    dateRange?: { from?: number; to?: number }
  ): void {
    if (dateRange?.from) {
      conditions.push(`created_at >= ${dateRange.from}`);
    }
    if (dateRange?.to) {
      conditions.push(`created_at <= ${dateRange.to}`);
    }
  }

  private addAccessFilter(
    conditions: string[],
    accessControl?: string[],
    isPublic?: boolean
  ): void {
    const accessCondition = this.buildAccessConditions(accessControl, isPublic);
    if (accessCondition) {
      conditions.push(accessCondition);
    }
  }

  private buildAccessConditions(
    accessControl?: string[],
    isPublic?: boolean
  ): string {
    if (isPublic === true) {
      return "is_public = true";
    }

    if (accessControl && accessControl.length > 0) {
      const accessConditions = accessControl
        .map((id) => `access_control contains "${this.escape(id)}"`)
        .join(" or ");
      return `(is_public = true or (${accessConditions}))`;
    }

    return "is_public = true";
  }
}

export const documentClient = new DocumentClient();
