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

search.use("/*", requireAuth);
search.use("/*", requireScopes([API_SCOPES.SEARCH_READ]));

search.openapi(mainSearch, mainSearchHandler);

search.openapi(autocomplete, autocompleteHandler);

search.openapi(recentDocuments, recentDocumentsHandler);

search.openapi(threadSearch, threadSearchHandler);

search.openapi(similarDocuments, similarDocumentsHandler);

search.openapi(authorSearch, authorSearchHandler);

export default search;
