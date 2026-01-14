import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const mediaChaptersTool = defineTool({
  name: "media_chapters",
  description: `Get auto-generated chapter markers for a video.

USE THIS WHEN:
- User wants to navigate video by topic
- User needs a structured outline of video content
- User is creating navigation for video playback

RETURNS: List of chapters with titles, summaries, and timestamps.`,
  category: "media",
  searchKeywords: ["video", "chapters", "sections", "outline", "navigation"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    videoId: z.string().describe("The video ID to get chapters for"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const chapters = await ctx.services.media.getChapters({
      teamId: ctx.teamId,
      videoId: params.videoId,
    });

    const chapterData = chapters.map((ch, idx) => ({
      number: idx + 1,
      title: ch.title,
      startSec: ch.start,
      endSec: ch.end,
      startFormatted: formatTimestamp(ch.start),
      endFormatted: formatTimestamp(ch.end),
      duration: ch.end - ch.start,
    }));

    return success({
      videoId: params.videoId,
      chapters: chapterData,
      chapterCount: chapters.length,
      message:
        chapters.length === 0
          ? "No chapters detected in this video"
          : undefined,
    });
  },
});

export const mediaHighlightsTool = defineTool({
  name: "media_highlights",
  description: `Get key highlights and notable moments from a video.

USE THIS WHEN:
- User wants the most important parts of a video
- User needs a quick preview of video content
- User is creating highlight reels or summaries

RETURNS: List of highlight moments with descriptions and timestamps.`,
  category: "media",
  searchKeywords: ["video", "highlights", "moments", "key", "important"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    videoId: z.string().describe("The video ID to get highlights for"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const highlights = await ctx.services.media.getHighlights({
      teamId: ctx.teamId,
      videoId: params.videoId,
    });

    const highlightData = highlights.map((h, idx) => ({
      number: idx + 1,
      description: h.description,
      startSec: h.start,
      endSec: h.end,
      startFormatted: formatTimestamp(h.start),
      duration: h.end - h.start,
    }));

    return success({
      videoId: params.videoId,
      highlights: highlightData,
      highlightCount: highlights.length,
      message:
        highlights.length === 0
          ? "No highlights detected in this video"
          : undefined,
    });
  },
});

export const mediaMetadataTool = defineTool({
  name: "media_metadata",
  description: `Get comprehensive metadata for a video including summary, keywords, chapters, and highlights.

USE THIS WHEN:
- User needs complete information about a video
- User wants all video metadata in one call
- User is cataloging or indexing video content

RETURNS: Full metadata including summary, keywords, duration, chapters, and highlights.`,
  category: "media",
  searchKeywords: ["video", "metadata", "info", "details", "complete"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    indexId: z.string().describe("The media index ID containing the video"),
    videoId: z.string().describe("The video ID to get metadata for"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const metadata = await ctx.services.media.getMetadata({
      teamId: ctx.teamId,
      indexId: params.indexId,
      videoId: params.videoId,
    });

    return success({
      videoId: params.videoId,
      summary: metadata.summary,
      keywords: metadata.keywords,
      duration: metadata.duration,
      durationFormatted: formatTimestamp(metadata.duration),
      thumbnailUrl: metadata.thumbnailUrl,
      chapters: metadata.chapters.map((ch, idx) => ({
        number: idx + 1,
        title: ch.title,
        startSec: ch.start,
        endSec: ch.end,
        startFormatted: formatTimestamp(ch.start),
      })),
      highlights: metadata.highlights.map((h, idx) => ({
        number: idx + 1,
        description: h.description,
        startSec: h.start,
        startFormatted: formatTimestamp(h.start),
      })),
      chapterCount: metadata.chapters.length,
      highlightCount: metadata.highlights.length,
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
