import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const mediaSearchTextTool = defineTool({
  name: "media_search_text",
  description: `Search video content using natural language text queries.

USE THIS WHEN:
- User wants to find specific moments in videos
- User is looking for video content matching a description
- User needs to locate visual or audio content by topic

RETURNS: Matching video segments with timestamps, relevance scores, and thumbnails.
Results are ranked by semantic similarity to the query.`,
  category: "media",
  searchKeywords: ["video", "search", "media", "find", "clip"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    indexId: z.string().describe("The media index ID to search within"),
    query: z
      .string()
      .min(1)
      .describe("Natural language description of what to find in the video"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of results (1-50)"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const results = await ctx.services.media.searchByText({
      teamId: ctx.teamId,
      indexId: params.indexId,
      query: params.query,
      limit: params.limit,
    });

    return success({
      query: params.query,
      results: results.map((r) => ({
        videoId: r.videoId,
        score: r.score,
        startSec: r.startSec,
        endSec: r.endSec,
        confidence: r.confidence,
        thumbnailUrl: r.thumbnailUrl,
        timestamp: formatTimestamp(r.startSec),
      })),
      count: results.length,
    });
  },
});

export const mediaSearchImageTool = defineTool({
  name: "media_search_image",
  description: `Search video content using an image as the query.

USE THIS WHEN:
- User wants to find video frames similar to an image
- User is looking for visual matches across videos
- User needs to locate specific scenes by visual appearance

RETURNS: Video segments containing visually similar content with timestamps and scores.`,
  category: "media",
  searchKeywords: ["video", "image", "visual", "search", "similar"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    indexId: z.string().describe("The media index ID to search within"),
    imageUrl: z.string().url().describe("URL of the image to search for"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of results (1-50)"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const results = await ctx.services.media.searchByImage({
      teamId: ctx.teamId,
      indexId: params.indexId,
      imageUrl: params.imageUrl,
      limit: params.limit,
    });

    return success({
      imageUrl: params.imageUrl,
      results: results.map((r) => ({
        videoId: r.videoId,
        score: r.score,
        startSec: r.startSec,
        endSec: r.endSec,
        confidence: r.confidence,
        thumbnailUrl: r.thumbnailUrl,
        timestamp: formatTimestamp(r.startSec),
      })),
      count: results.length,
    });
  },
});

function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
