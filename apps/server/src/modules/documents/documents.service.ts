/**
 * Documents Service
 * Business logic for document operations
 *
 * Uses @openplane/vespa documentClient for clean, type-safe operations.
 */

import {
  type DocumentInput,
  type DocumentSearchOptions,
  type DocumentUpdate,
  documentClient,
  generateDocumentId,
  hasAccess,
  type OpenPlaneDocument,
  type VespaHit,
} from "@openplane/vespa";
import type { DocumentDetail, DocumentSummary } from "@/types/api";

// ============================================================================
// Types
// ============================================================================

export interface ListDocumentsParams {
  teamId: string;
  accessControlIds?: string[];
  connectorId?: string;
  connectorType?: string;
  documentType?: string;
  authorId?: string;
  sourceId?: string;
  tags?: string[];
  fromDate?: number;
  toDate?: number;
  limit: number;
  offset: number;
  sortBy: "createdAt" | "updatedAt" | "title";
  sortOrder: "asc" | "desc";
}

export interface CreateDocumentParams {
  teamId: string;
  title: string;
  content: string;
  contentType: "text" | "markdown" | "html";
  documentType: string;
  url?: string;
  sourceId?: string;
  authorId?: string;
  authorName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  isPublic: boolean;
  accessControl: string[];
}

export interface UpdateDocumentParams {
  title?: string;
  content?: string;
  contentType?: "text" | "markdown" | "html";
  tags?: string[];
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
  accessControl?: string[];
}

// ============================================================================
// Service Class
// ============================================================================

export class DocumentsService {
  /**
   * List documents with filtering and pagination
   * Uses documentClient.search for type-safe queries
   */
  async listDocuments(
    params: ListDocumentsParams
  ): Promise<{ documents: DocumentSummary[]; total: number }> {
    // Build search options for documentClient
    const searchOptions: DocumentSearchOptions = {
      teamId: params.teamId,
      accessControl: params.accessControlIds,
      connectorId: params.connectorId,
      connectorType: params.connectorType,
      documentType: params.documentType,
      authorId: params.authorId,
      sourceId: params.sourceId,
      dateRange:
        params.fromDate || params.toDate
          ? { from: params.fromDate, to: params.toDate }
          : undefined,
      limit: params.limit,
      offset: params.offset,
      rankProfile: this.mapSortByToRankProfile(params.sortBy),
    };

    const result = await documentClient.search(searchOptions);

    // Sort in memory if needed (Vespa handles most sorting via rank profiles)
    let items = result.items;
    if (params.sortBy === "title") {
      items = this.sortByTitle(items, params.sortOrder);
    }

    const documents = this.mapVespaHitsToSummaries(items);

    return { documents, total: result.total };
  }

  /**
   * Get a single document by ID
   * Uses documentClient.get for direct fetch
   */
  async getDocument(
    documentId: string,
    teamId: string,
    accessControlIds?: string[],
    options?: { includeRelated?: boolean }
  ): Promise<DocumentDetail | null> {
    const doc = await documentClient.get(documentId);

    if (!doc) {
      return null;
    }

    // Verify team ownership
    if (doc.team_id !== teamId) {
      return null;
    }

    // Verify access using @vespa hasAccess utility
    if (!hasAccess(accessControlIds || [], doc.access_control, doc.is_public)) {
      return null;
    }

    let relatedDocuments: DocumentSummary[] | undefined;

    if (options?.includeRelated && doc.content_embedding) {
      // Use documentClient.getSimilar for similar documents
      const similar = await documentClient.getSimilar(documentId, teamId, {
        limit: 5,
      });
      relatedDocuments = this.filterAndMapSimilar(similar, accessControlIds);
    }

    return this.mapDocumentToDetail(doc, relatedDocuments);
  }

  /**
   * Create a new document
   * Uses documentClient.feed for type-safe indexing
   */
  async createDocument(params: CreateDocumentParams): Promise<string> {
    const documentId = generateDocumentId("manual", params.teamId);

    const docInput: DocumentInput = {
      id: documentId,
      team_id: params.teamId,
      title: params.title,
      content: params.content,
      content_type: params.contentType,
      document_type: params.documentType,
      connector_type: "MANUAL",
      connector_id: "manual",
      url: params.url,
      source_id: params.sourceId,
      author_id: params.authorId,
      author_name: params.authorName,
      tags: params.tags,
      metadata: params.metadata,
      is_public: params.isPublic,
      access_control: params.accessControl,
    };

    await documentClient.feed(docInput);

    return documentId;
  }

  /**
   * Update a document
   * Uses documentClient.update for partial updates
   */
  async updateDocument(
    documentId: string,
    teamId: string,
    updates: UpdateDocumentParams,
    accessControlIds?: string[]
  ): Promise<boolean> {
    // Verify document exists and is accessible
    const doc = await documentClient.get(documentId);
    if (!doc || doc.team_id !== teamId) {
      return false;
    }

    if (!hasAccess(accessControlIds || [], doc.access_control, doc.is_public)) {
      return false;
    }

    // Build update fields
    const docUpdate: DocumentUpdate = {};

    if (updates.title !== undefined) {
      docUpdate.title = updates.title;
    }
    if (updates.content !== undefined) {
      docUpdate.content = updates.content;
    }
    if (updates.contentType !== undefined) {
      docUpdate.content_type = updates.contentType;
    }
    if (updates.tags !== undefined) {
      docUpdate.tags = updates.tags;
    }
    if (updates.metadata !== undefined) {
      docUpdate.metadata = updates.metadata;
    }
    if (updates.isPublic !== undefined) {
      docUpdate.is_public = updates.isPublic;
    }
    if (updates.accessControl !== undefined) {
      docUpdate.access_control = updates.accessControl;
    }

    await documentClient.update(documentId, docUpdate);

    return true;
  }

  /**
   * Delete a document
   * Uses documentClient.delete
   */
  async deleteDocument(
    documentId: string,
    teamId: string,
    accessControlIds?: string[]
  ): Promise<boolean> {
    // Verify document exists and is accessible
    const doc = await documentClient.get(documentId);
    if (!doc || doc.team_id !== teamId) {
      return false;
    }

    if (!hasAccess(accessControlIds || [], doc.access_control, doc.is_public)) {
      return false;
    }

    await documentClient.delete(documentId);

    return true;
  }

  /**
   * Bulk delete documents
   */
  async bulkDelete(
    documentIds: string[],
    teamId: string,
    accessControlIds?: string[]
  ): Promise<{
    succeeded: number;
    failed: number;
    errors?: Array<{ documentId: string; error: string }>;
  }> {
    const errors: Array<{ documentId: string; error: string }> = [];
    let succeeded = 0;

    // Process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (documentId) => {
          const deleted = await this.deleteDocument(
            documentId,
            teamId,
            accessControlIds
          );
          if (!deleted) {
            throw new Error("Document not found or access denied");
          }
        })
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          succeeded += 1;
        } else {
          errors.push({
            documentId: batch[index],
            error: result.reason?.message || "Unknown error",
          });
        }
      });
    }

    return {
      succeeded,
      failed: errors.length,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * Bulk update documents
   */
  async bulkUpdate(
    documentIds: string[],
    updates: UpdateDocumentParams,
    teamId: string,
    accessControlIds?: string[]
  ): Promise<{
    succeeded: number;
    failed: number;
    errors?: Array<{ documentId: string; error: string }>;
  }> {
    const errors: Array<{ documentId: string; error: string }> = [];
    let succeeded = 0;

    // Process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (documentId) => {
          const updated = await this.updateDocument(
            documentId,
            teamId,
            updates,
            accessControlIds
          );
          if (!updated) {
            throw new Error("Document not found or access denied");
          }
        })
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          succeeded += 1;
        } else {
          errors.push({
            documentId: batch[index],
            error: result.reason?.message || "Unknown error",
          });
        }
      });
    }

    return {
      succeeded,
      failed: errors.length,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * Get documents by connector
   * Uses documentClient.search with connectorId filter
   */
  async getDocumentsByConnector(
    connectorId: string,
    teamId: string,
    options?: { limit?: number; offset?: number }
  ) {
    return await documentClient.search({
      teamId,
      connectorId,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    });
  }

  /**
   * Get recent documents
   * Uses documentClient.getRecent
   */
  async getRecentDocuments(
    teamId: string,
    options?: { hours?: number; limit?: number; connectorType?: string }
  ) {
    return await documentClient.getRecent(teamId, options);
  }

  /**
   * Increment document view count
   * Uses documentClient.incrementViewCount
   */
  async trackView(documentId: string) {
    await documentClient.incrementViewCount(documentId);
  }

  /**
   * Increment document click count
   * Uses documentClient.incrementClickCount
   */
  async trackClick(documentId: string) {
    await documentClient.incrementClickCount(documentId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapSortByToRankProfile(
    sortBy: string
  ): "bm25" | "semantic" | "hybrid" | "recency" {
    const mapping: Record<string, "bm25" | "semantic" | "hybrid" | "recency"> =
      {
        createdAt: "recency",
        updatedAt: "recency",
        title: "bm25",
      };
    return mapping[sortBy] || "bm25";
  }

  private sortByTitle(
    items: VespaHit<OpenPlaneDocument>[],
    order: "asc" | "desc"
  ): VespaHit<OpenPlaneDocument>[] {
    return [...items].sort((a, b) => {
      const titleA = (a.fields.title || "").toLowerCase();
      const titleB = (b.fields.title || "").toLowerCase();
      const comparison = titleA.localeCompare(titleB);
      return order === "asc" ? comparison : -comparison;
    });
  }

  private filterAndMapSimilar(
    hits: VespaHit<OpenPlaneDocument>[],
    accessControlIds?: string[]
  ): DocumentSummary[] {
    const filtered = hits.filter((hit) =>
      hasAccess(
        accessControlIds || [],
        hit.fields.access_control,
        hit.fields.is_public
      )
    );
    return this.mapVespaHitsToSummaries(filtered);
  }

  private mapVespaHitsToSummaries(
    hits: VespaHit<OpenPlaneDocument>[]
  ): DocumentSummary[] {
    return hits.map((hit) => this.mapVespaHitToSummary(hit));
  }

  private mapVespaHitToSummary(
    hit: VespaHit<OpenPlaneDocument>
  ): DocumentSummary {
    const fields = hit.fields;
    return {
      id: fields.id,
      title: fields.title || "Untitled",
      documentType: fields.document_type || "document",
      connectorType: fields.connector_type || "UNKNOWN",
      connectorId: fields.connector_id || "",
      url: fields.url,
      thumbnail: fields.thumbnail,
      snippet: this.generateSnippet(fields.content),
      authorId: fields.author_id,
      authorName: fields.author_name,
      authorAvatar: fields.author_avatar,
      createdAt: fields.created_at || Date.now(),
      updatedAt: fields.updated_at,
      accessControl: fields.access_control || [],
      isPublic: fields.is_public,
      relevanceScore: hit.relevance,
    };
  }

  private mapDocumentToDetail(
    doc: OpenPlaneDocument,
    relatedDocuments?: DocumentSummary[]
  ): DocumentDetail {
    return {
      id: doc.id,
      title: doc.title || "Untitled",
      documentType: doc.document_type || "document",
      connectorType: doc.connector_type || "UNKNOWN",
      connectorId: doc.connector_id || "",
      url: doc.url,
      thumbnail: doc.thumbnail,
      snippet: this.generateSnippet(doc.content),
      authorId: doc.author_id,
      authorName: doc.author_name,
      authorAvatar: doc.author_avatar,
      createdAt: doc.created_at || Date.now(),
      updatedAt: doc.updated_at,
      accessControl: doc.access_control || [],
      isPublic: doc.is_public,
      content: doc.content || "",
      contentType: doc.content_type || "text",
      rawContent: doc.raw_content,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      attachments: doc.attachments as DocumentDetail["attachments"],
      reactions: doc.reactions as DocumentDetail["reactions"],
      threadId: doc.thread_id,
      parentId: doc.parent_id,
      relatedDocuments,
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

export const documentsService = new DocumentsService();
