import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  authorSearchHandler,
  autocompleteHandler,
  imageSearchHandler,
  mainSearchHandler,
  recentDocumentsHandler,
  similarDocumentsHandler,
  threadSearchHandler,
  unifiedSearchHandler,
  videoSearchHandler,
} from "./search.handlers";
import {
  authorSearch,
  autocomplete,
  imageSearch,
  mainSearch,
  recentDocuments,
  similarDocuments,
  threadSearch,
  unifiedSearch,
  videoSearch,
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
search.openapi(videoSearch, videoSearchHandler);
search.openapi(unifiedSearch, unifiedSearchHandler);
search.openapi(imageSearch, imageSearchHandler);

export default search;
