import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  askHandler,
  getChaptersHandler,
  getHighlightsHandler,
  getMetadataHandler,
  getSummaryHandler,
  getTranscriptHandler,
  regenerateHandler,
} from "./media.handlers";
import {
  askRoute,
  getChaptersRoute,
  getHighlightsRoute,
  getMetadataRoute,
  getSummaryRoute,
  getTranscriptRoute,
  regenerateRoute,
} from "./media.routes";

const media = new OpenAPIHono<AuthEnv>();

media.use("/*", requireAuth);

media.use("/:vespaId/chapters", requireScopes([API_SCOPES.MEDIA_READ]));
media.openapi(getChaptersRoute, getChaptersHandler);

media.use("/:vespaId/highlights", requireScopes([API_SCOPES.MEDIA_READ]));
media.openapi(getHighlightsRoute, getHighlightsHandler);

media.use("/:vespaId/transcript", requireScopes([API_SCOPES.MEDIA_READ]));
media.openapi(getTranscriptRoute, getTranscriptHandler);

media.use("/:vespaId/summary", requireScopes([API_SCOPES.MEDIA_READ]));
media.openapi(getSummaryRoute, getSummaryHandler);

media.use("/:vespaId/metadata", requireScopes([API_SCOPES.MEDIA_READ]));
media.openapi(getMetadataRoute, getMetadataHandler);

media.use("/:vespaId/regenerate", requireScopes([API_SCOPES.MEDIA_WRITE]));
media.openapi(regenerateRoute, regenerateHandler);

media.use("/:mediaId/ask", requireScopes([API_SCOPES.MEDIA_WRITE]));
media.openapi(askRoute, askHandler);

export default media;
