/**
 * Documents API Handlers
 * Request handlers for document operations
 */

import type { RouteHandler } from "@hono/zod-openapi";
import * as response from "@/lib/response";
import { type AuthEnv, getTeamId } from "@/middleware/auth";
import { getAccessControlIds } from "@/types/auth";
import type {
  bulkDelete,
  bulkUpdate,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "./documents.routes";
import { documentsService } from "./documents.service";

// ============================================================================
// List Documents
// ============================================================================

export const listDocumentsHandler: RouteHandler<
  typeof listDocuments,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const { documents, total } = await documentsService.listDocuments({
    teamId,
    accessControlIds,
    connectorId: query.connectorId,
    connectorType: query.connectorType,
    documentType: query.documentType,
    authorId: query.authorId,
    sourceId: query.sourceId,
    tags: query.tags,
    fromDate: query.fromDate,
    toDate: query.toDate,
    limit: query.limit,
    offset: query.offset,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  const page = Math.floor(query.offset / query.limit) + 1;

  return response.paginated(c, documents, {
    page,
    pageSize: query.limit,
    total,
  });
};

// ============================================================================
// Get Document
// ============================================================================

export const getDocumentHandler: RouteHandler<
  typeof getDocument,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const document = await documentsService.getDocument(
    id,
    teamId,
    accessControlIds,
    { includeRelated: query.includeRelated }
  );

  if (!document) {
    return response.notFound(c, "Document", id);
  }

  return response.success(c, document);
};

// ============================================================================
// Create Document
// ============================================================================

export const createDocumentHandler: RouteHandler<
  typeof createDocument,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const documentId = await documentsService.createDocument({
    teamId,
    title: body.title,
    content: body.content,
    contentType: body.contentType,
    documentType: body.documentType,
    url: body.url,
    sourceId: body.sourceId,
    authorId: body.authorId,
    authorName: body.authorName,
    tags: body.tags,
    metadata: body.metadata as Record<string, unknown> | undefined,
    isPublic: body.isPublic,
    accessControl: body.accessControl,
  });

  return response.success(
    c,
    {
      id: documentId,
      message: "Document created successfully",
    },
    201
  );
};

// ============================================================================
// Update Document
// ============================================================================

export const updateDocumentHandler: RouteHandler<
  typeof updateDocument,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const updated = await documentsService.updateDocument(
    id,
    teamId,
    {
      title: body.title,
      content: body.content,
      contentType: body.contentType,
      tags: body.tags,
      metadata: body.metadata as Record<string, unknown> | undefined,
      isPublic: body.isPublic,
      accessControl: body.accessControl,
    },
    accessControlIds
  );

  if (!updated) {
    return response.notFound(c, "Document", id);
  }

  return response.success(c, {
    id,
    message: "Document updated successfully",
  });
};

// ============================================================================
// Delete Document
// ============================================================================

export const deleteDocumentHandler: RouteHandler<
  typeof deleteDocument,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const deleted = await documentsService.deleteDocument(
    id,
    teamId,
    accessControlIds
  );

  if (!deleted) {
    return response.notFound(c, "Document", id);
  }

  return response.success(c, {
    message: "Document deleted successfully",
  });
};

// ============================================================================
// Bulk Delete
// ============================================================================

export const bulkDeleteHandler: RouteHandler<
  typeof bulkDelete,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const result = await documentsService.bulkDelete(
    body.documentIds,
    teamId,
    accessControlIds
  );

  return response.success(c, result);
};

// ============================================================================
// Bulk Update
// ============================================================================

export const bulkUpdateHandler: RouteHandler<
  typeof bulkUpdate,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const result = await documentsService.bulkUpdate(
    body.documentIds,
    {
      tags: body.updates.tags,
      isPublic: body.updates.isPublic,
      accessControl: body.updates.accessControl,
      metadata: body.updates.metadata as Record<string, unknown> | undefined,
    },
    teamId,
    accessControlIds
  );

  return response.success(c, result);
};
