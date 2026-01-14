import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const WHITESPACE_REGEX = /\s+/;

export const mediaTranscriptTool = defineTool({
  name: "media_transcript",
  description: `Get the full transcript of a video.

USE THIS WHEN:
- User needs the complete spoken content from a video
- User wants to search or analyze video dialogue
- User is creating written documentation from video content

RETURNS: Full text transcript of all spoken content in the video.`,
  category: "media",
  searchKeywords: ["video", "transcript", "text", "speech", "captions"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    indexId: z.string().describe("The media index ID containing the video"),
    videoId: z.string().describe("The video ID to get transcript for"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const transcript = await ctx.services.media.getTranscript({
      teamId: ctx.teamId,
      indexId: params.indexId,
      videoId: params.videoId,
    });

    if (!transcript) {
      return failure("NOT_FOUND", "No transcript available for this video", {
        suggestion: "The video may not have audio or may still be processing",
      });
    }

    return success({
      videoId: params.videoId,
      transcript,
      characterCount: transcript.length,
      wordCount: transcript.split(WHITESPACE_REGEX).filter(Boolean).length,
    });
  },
});

export const mediaTranscriptTimestampsTool = defineTool({
  name: "media_transcript_timestamps",
  description: `Get video transcript with precise timestamps for each segment.

USE THIS WHEN:
- User needs to navigate to specific spoken content in video
- User wants timestamps for quoting or referencing
- User is creating time-coded documentation

RETURNS: Transcript segments with start/end times for each spoken phrase.`,
  category: "media",
  searchKeywords: ["video", "transcript", "timestamps", "subtitles", "timed"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    indexId: z.string().describe("The media index ID containing the video"),
    videoId: z
      .string()
      .describe("The video ID to get timestamped transcript for"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const segments = await ctx.services.media.getTranscriptWithTimestamps({
      teamId: ctx.teamId,
      indexId: params.indexId,
      videoId: params.videoId,
    });

    if (segments.length === 0) {
      return failure("NOT_FOUND", "No transcript available for this video", {
        suggestion: "The video may not have audio or may still be processing",
      });
    }

    return success({
      videoId: params.videoId,
      segments: segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        startFormatted: formatTimestamp(seg.start),
        endFormatted: formatTimestamp(seg.end),
        text: seg.value,
      })),
      segmentCount: segments.length,
      totalDuration: segments.at(-1)?.end ?? 0,
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
