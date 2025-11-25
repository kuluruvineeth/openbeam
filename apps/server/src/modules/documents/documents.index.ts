/**
 * Documents API Module
 * Entry point for document operations
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/scopes";
import {
  bulkDeleteHandler,
  bulkUpdateHandler,
  createDocumentHandler,
  deleteDocumentHandler,
  getDocumentHandler,
  listDocumentsHandler,
  updateDocumentHandler,
} from "./documents.handlers";
import {
  bulkDelete,
  bulkUpdate,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "./documents.routes";

const documents = new OpenAPIHono<AuthEnv>();

// Apply auth middleware globally
documents.use("/*", requireAuth);

// ============================================================================
// Read Operations - require documents:read
// ============================================================================

documents.use("/", requireScopes([API_SCOPES.DOCUMENTS_READ]));
documents.openapi(listDocuments, listDocumentsHandler);

documents.use("/:id", requireScopes([API_SCOPES.DOCUMENTS_READ]));
documents.openapi(getDocument, getDocumentHandler);

// ============================================================================
// Write Operations - require documents:write
// ============================================================================

documents.use("/", requireScopes([API_SCOPES.DOCUMENTS_WRITE]));
documents.openapi(createDocument, createDocumentHandler);

documents.use("/:id", requireScopes([API_SCOPES.DOCUMENTS_WRITE]));
documents.openapi(updateDocument, updateDocumentHandler);

// ============================================================================
// Delete Operations - require documents:delete
// ============================================================================

documents.use("/:id", requireScopes([API_SCOPES.DOCUMENTS_DELETE]));
documents.openapi(deleteDocument, deleteDocumentHandler);

// ============================================================================
// Bulk Operations
// ============================================================================

documents.use("/bulk-delete", requireScopes([API_SCOPES.DOCUMENTS_DELETE]));
documents.openapi(bulkDelete, bulkDeleteHandler);

documents.use("/bulk-update", requireScopes([API_SCOPES.DOCUMENTS_WRITE]));
documents.openapi(bulkUpdate, bulkUpdateHandler);

export default documents;
