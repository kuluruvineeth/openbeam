/**
 * Enhanced Search API Module
 * Entry point for search operations
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/scopes";
import {
  answerSearchHandler,
  authorSearchHandler,
  autocompleteHandler,
  mainSearchHandler,
  recentDocumentsHandler,
  similarDocumentsHandler,
  threadSearchHandler,
} from "./search.handlers";
import {
  answerSearch,
  authorSearch,
  autocomplete,
  mainSearch,
  recentDocuments,
  similarDocuments,
  threadSearch,
} from "./search.routes";

const search = new OpenAPIHono<AuthEnv>();

// Apply auth middleware globally
search.use("/*", requireAuth);
search.use("/*", requireScopes([API_SCOPES.SEARCH_READ]));

// ============================================================================
// Search Endpoints
// ============================================================================

// Main search
search.openapi(mainSearch, mainSearchHandler);

// Autocomplete
search.openapi(autocomplete, autocompleteHandler);

// Recent documents
search.openapi(recentDocuments, recentDocumentsHandler);

// Thread search
search.openapi(threadSearch, threadSearchHandler);

// Similar documents
search.openapi(similarDocuments, similarDocumentsHandler);

// Author search
search.openapi(authorSearch, authorSearchHandler);

// AI Answer (requires additional scope in production)
search.openapi(answerSearch, answerSearchHandler);

export default search;
