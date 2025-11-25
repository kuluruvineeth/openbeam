/**
 * Document Service
 * Business logic for document CRUD operations
 *
 * Uses @openplane/vespa documentClient for type-safe operations.
 */

import {
  type DocumentInput,
  type DocumentUpdate,
  documentClient,
  generateDocumentId,
  hasAccess,
  type OpenPlaneDocument,
  type VespaHit,
} from "@openplane/vespa";
import type { DocumentDetail, DocumentSummary } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface ListDocumentsOptions {
  connectorId?: string;
  connectorType?: string;
  documentType?: string;
  authorId?: string;
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
}

export interface CreateDocumentParams {
  teamId: string;
  connectorId: string;
  connectorType: string;
  title: string;
  content?: string;
  contentType?: string;
  documentType?: string;
  url?: string;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  sourceId?: string;
  sourcePath?: string;
  threadId?: string;
  parentId?: string;
  accessControl?: string[];
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentParams {
  title?: string;
  content?: string;
  contentType?: string;
  url?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  accessControl?: string[];
  isPublic?: boolean;
}

export interface BulkOperationResult {
  succeeded: number;
  failed: number;
  errors?: Array<{ documentId: string; error: string }>;
}

// ============================================================================
// Document Service Functions
// ============================================================================

/**
 * List documents with filtering
 */
export async function listDocuments(
  teamId: string,
  options: ListDocumentsOptions = {}
): Promise<{ documents: DocumentSummary[]; total: number }> {
  const { limit = 20, offset = 0, accessControlIds, ...filters } = options;

  const result = await documentClient.search({
    teamId,
    ...filters,
    accessControl: accessControlIds,
    limit,
    offset,
  });

  const documents = result.items.map((hit) => mapVespaHitToSummary(hit));

  return { documents, total: result.total };
}

/**
 * Get a single document by ID
 */
export async function getDocument(
  documentId: string,
  teamId: string,
  accessControlIds?: string[]
): Promise<DocumentDetail | null> {
  const doc = await documentClient.get(documentId);

  if (!doc || doc.team_id !== teamId) {
    return null;
  }

  // Check access control
  if (!hasAccess(doc, accessControlIds || [])) {
    return null;
  }

  return mapDocumentToDetail(doc);
}

/**
 * Create a new document
 */
export async function createDocument(
  params: CreateDocumentParams
): Promise<DocumentDetail> {
  const documentId = generateDocumentId(
    params.teamId,
    params.connectorType,
    params.sourceId || `manual_${Date.now()}`
  );

  const now = Date.now();

  const input: DocumentInput = {
    id: documentId,
    team_id: params.teamId,
    connector_id: params.connectorId,
    connector_type: params.connectorType,
    document_type: params.documentType || "document",
    title: params.title,
    content: params.content || "",
    content_type: params.contentType || "text",
    url: params.url,
    author_id: params.authorId,
    author_name: params.authorName,
    author_email: params.authorEmail,
    source_id: params.sourceId,
    source_path: params.sourcePath,
    thread_id: params.threadId,
    parent_id: params.parentId,
    access_control: params.accessControl || [],
    is_public: params.isPublic ?? false,
    is_archived: false,
    is_deleted: false,
    tags: params.tags || [],
    metadata: params.metadata || {},
    created_at: now,
    updated_at: now,
  };

  await documentClient.feed(input);

  return {
    id: documentId,
    title: params.title,
    documentType: params.documentType || "document",
    connectorType: params.connectorType,
    connectorId: params.connectorId,
    url: params.url,
    content: params.content,
    contentType: params.contentType,
    authorId: params.authorId,
    authorName: params.authorName,
    sourceId: params.sourceId,
    sourcePath: params.sourcePath,
    threadId: params.threadId,
    parentId: params.parentId,
    tags: params.tags,
    metadata: params.metadata,
    accessControl: params.accessControl || [],
    isPublic: params.isPublic,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update a document
 */
export async function updateDocument(
  documentId: string,
  teamId: string,
  updates: UpdateDocumentParams,
  accessControlIds?: string[]
): Promise<DocumentDetail | null> {
  // Verify document exists and user has access
  const existingDoc = await documentClient.get(documentId);

  if (!existingDoc || existingDoc.team_id !== teamId) {
    return null;
  }

  if (!hasAccess(existingDoc, accessControlIds || [])) {
    return null;
  }

  // Build update object
  const updateData: DocumentUpdate = {
    ...(updates.title !== undefined && { title: updates.title }),
    ...(updates.content !== undefined && { content: updates.content }),
    ...(updates.contentType !== undefined && {
      content_type: updates.contentType,
    }),
    ...(updates.url !== undefined && { url: updates.url }),
    ...(updates.tags !== undefined && { tags: updates.tags }),
    ...(updates.metadata !== undefined && { metadata: updates.metadata }),
    ...(updates.accessControl !== undefined && {
      access_control: updates.accessControl,
    }),
    ...(updates.isPublic !== undefined && { is_public: updates.isPublic }),
    updated_at: Date.now(),
  };

  await documentClient.update(documentId, updateData);

  // Return updated document
  const updatedDoc = await documentClient.get(documentId);
  return updatedDoc ? mapDocumentToDetail(updatedDoc) : null;
}

/**
 * Delete a document (soft delete)
 */
export async function deleteDocument(
  documentId: string,
  teamId: string,
  accessControlIds?: string[]
): Promise<boolean> {
  // Verify document exists and user has access
  const doc = await documentClient.get(documentId);

  if (!doc || doc.team_id !== teamId) {
    return false;
  }

  if (!hasAccess(doc, accessControlIds || [])) {
    return false;
  }

  // Soft delete
  await documentClient.update(documentId, {
    is_deleted: true,
    updated_at: Date.now(),
  });

  return true;
}

/**
 * Hard delete a document
 */
export async function hardDeleteDocument(
  documentId: string,
  teamId: string
): Promise<boolean> {
  const doc = await documentClient.get(documentId);

  if (!doc || doc.team_id !== teamId) {
    return false;
  }

  await documentClient.delete(documentId);
  return true;
}

/**
 * Bulk delete documents
 */
export async function bulkDeleteDocuments(
  documentIds: string[],
  teamId: string,
  accessControlIds?: string[]
): Promise<BulkOperationResult> {
  const errors: Array<{ documentId: string; error: string }> = [];
  let succeeded = 0;

  const batchSize = 10;
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (docId) => {
        const deleted = await deleteDocument(docId, teamId, accessControlIds);
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
 * Get recent documents for a team
 */
export async function getRecentDocuments(
  teamId: string,
  options: { hours?: number; limit?: number; accessControlIds?: string[] } = {}
): Promise<DocumentSummary[]> {
  const { hours = 24, limit = 20, accessControlIds } = options;

  const results = await documentClient.getRecent(teamId, { hours, limit });

  // Filter by access control
  const filtered = results.filter((hit) => {
    if (hit.fields.is_public) {
      return true;
    }
    if (!accessControlIds?.length) {
      return false;
    }
    const acl = hit.fields.access_control || [];
    return accessControlIds.some((id) => acl.includes(id));
  });

  return filtered.map((hit) => mapVespaHitToSummary(hit));
}

// ============================================================================
// Private Helpers
// ============================================================================

function mapVespaHitToSummary(
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
    snippet: generateSnippet(fields.content),
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

function mapDocumentToDetail(doc: OpenPlaneDocument): DocumentDetail {
  return {
    id: doc.id,
    title: doc.title || "Untitled",
    documentType: doc.document_type || "document",
    connectorType: doc.connector_type || "UNKNOWN",
    connectorId: doc.connector_id || "",
    url: doc.url,
    thumbnail: doc.thumbnail,
    content: doc.content,
    contentType: doc.content_type,
    authorId: doc.author_id,
    authorName: doc.author_name,
    authorAvatar: doc.author_avatar,
    sourceId: doc.source_id,
    sourcePath: doc.source_path,
    threadId: doc.thread_id,
    parentId: doc.parent_id,
    tags: doc.tags,
    metadata: doc.metadata as Record<string, unknown>,
    createdAt: doc.created_at || Date.now(),
    updatedAt: doc.updated_at,
    accessControl: doc.access_control || [],
    isPublic: doc.is_public,
  };
}

function generateSnippet(content?: string, maxLength = 200): string {
  if (!content) {
    return "";
  }
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength)}...`;
}

// ============================================================================
// Re-export types
// ============================================================================

export type { DocumentDetail, DocumentSummary } from "../types";
