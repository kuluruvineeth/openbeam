import type { RouteHandler } from "@hono/zod-openapi";
import { mediaAIService, mediaMetadataService } from "@openplane/services";
import type { AuthEnv } from "@/middleware/auth";
import type {
  askRoute,
  getChaptersRoute,
  getHighlightsRoute,
  getMetadataRoute,
  getSummaryRoute,
  getTranscriptRoute,
  regenerateRoute,
} from "./media.routes";

export const getChaptersHandler: RouteHandler<
  typeof getChaptersRoute,
  AuthEnv
> = async (c) => {
  const { vespaId } = c.req.valid("param");
  const { forceRefresh } = c.req.valid("query");
  try {
    const chapters = await mediaMetadataService.getChapters(
      vespaId,
      forceRefresh
    );
    return c.json({ chapters }, 200);
  } catch {
    return c.json({ error: "Failed to fetch chapters" }, 400);
  }
};

export const getHighlightsHandler: RouteHandler<
  typeof getHighlightsRoute,
  AuthEnv
> = async (c) => {
  const { vespaId } = c.req.valid("param");
  const { forceRefresh } = c.req.valid("query");
  try {
    const highlights = await mediaMetadataService.getHighlights(
      vespaId,
      forceRefresh
    );
    return c.json({ highlights }, 200);
  } catch {
    return c.json({ error: "Failed to fetch highlights" }, 400);
  }
};

export const getTranscriptHandler: RouteHandler<
  typeof getTranscriptRoute,
  AuthEnv
> = async (c) => {
  const { vespaId } = c.req.valid("param");
  const { forceRefresh } = c.req.valid("query");
  try {
    const segments = await mediaMetadataService.getTranscriptSegments(
      vespaId,
      forceRefresh
    );
    return c.json({ segments }, 200);
  } catch {
    return c.json({ error: "Failed to fetch transcript" }, 400);
  }
};

export const getSummaryHandler: RouteHandler<
  typeof getSummaryRoute,
  AuthEnv
> = async (c) => {
  const { vespaId } = c.req.valid("param");
  const { forceRefresh } = c.req.valid("query");
  try {
    const summary = await mediaMetadataService.getSummary(
      vespaId,
      forceRefresh
    );
    return c.json({ summary }, 200);
  } catch {
    return c.json({ error: "Failed to fetch summary" }, 400);
  }
};

export const getMetadataHandler: RouteHandler<
  typeof getMetadataRoute,
  AuthEnv
> = async (c) => {
  const { vespaId } = c.req.valid("param");
  try {
    const metadata = await mediaMetadataService.getMediaMetadata(vespaId);
    return c.json(metadata, 200);
  } catch {
    return c.json({ error: "Failed to fetch metadata" }, 400);
  }
};

export const regenerateHandler: RouteHandler<
  typeof regenerateRoute,
  AuthEnv
> = async (c) => {
  const { vespaId } = c.req.valid("param");
  const input = c.req.valid("json");
  try {
    const result = await mediaMetadataService.regenerateContent(
      vespaId,
      input.contentTypes
    );
    return c.json(result, 200);
  } catch {
    return c.json({ error: "Failed to regenerate content" }, 400);
  }
};

export const askHandler: RouteHandler<typeof askRoute, AuthEnv> = async (c) => {
  const { mediaId } = c.req.valid("param");
  const input = c.req.valid("json");
  try {
    const result = await mediaAIService.analyzeMedia(mediaId, input.question);
    return c.json(result, 200);
  } catch {
    return c.json({ error: "Failed to process media question" }, 400);
  }
};
