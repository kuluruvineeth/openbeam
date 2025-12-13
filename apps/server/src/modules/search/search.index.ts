import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  authorSearchHandler,
  mainSearchHandler,
  mediaSearchHandler,
  recentDocumentsHandler,
  similarDocumentsHandler,
  threadSearchHandler,
  unifiedSearchHandler,
} from "./search.handlers";
import {
  authorSearch,
  mainSearch,
  mediaSearch,
  recentDocuments,
  similarDocuments,
  threadSearch,
  unifiedSearch,
} from "./search.routes";

const search = new OpenAPIHono<AuthEnv>();

search.use("/*", requireAuth);
search.use("/*", requireScopes([API_SCOPES.SEARCH_READ]));

search.openapi(mainSearch, mainSearchHandler);
search.openapi(recentDocuments, recentDocumentsHandler);
search.openapi(threadSearch, threadSearchHandler);
search.openapi(similarDocuments, similarDocumentsHandler);
search.openapi(authorSearch, authorSearchHandler);
search.openapi(mediaSearch, mediaSearchHandler);
search.openapi(unifiedSearch, unifiedSearchHandler);

export default search;
