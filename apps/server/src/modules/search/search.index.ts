import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  authorSearchHandler,
  autocompleteHandler,
  mainSearchHandler,
  recentDocumentsHandler,
  similarDocumentsHandler,
  threadSearchHandler,
} from "./search.handlers";
import {
  authorSearch,
  autocomplete,
  mainSearch,
  recentDocuments,
  similarDocuments,
  threadSearch,
} from "./search.routes";

const search = new OpenAPIHono<AuthEnv>();

// Apply Auth Middleware
search.use("/*", requireAuth);
search.use("/*", requireScopes([API_SCOPES.SEARCH_READ]));

// Main Search
search.openapi(mainSearch, mainSearchHandler);

// Autocomplete
search.openapi(autocomplete, autocompleteHandler);

// Recent Documents
search.openapi(recentDocuments, recentDocumentsHandler);

// Thread Search
search.openapi(threadSearch, threadSearchHandler);

// Similar Documents
search.openapi(similarDocuments, similarDocumentsHandler);

// Author Search
search.openapi(authorSearch, authorSearchHandler);

export default search;
