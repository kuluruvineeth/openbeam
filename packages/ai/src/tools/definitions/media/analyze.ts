import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const mediaAnalyzeTool = defineTool({
  name: "media_analyze",
  description: `Ask questions about video content using AI analysis.

USE THIS WHEN:
- User has specific questions about video content
- User needs insights or interpretations from video
- User wants to extract structured information from video

RETURNS: AI-generated answer based on video content analysis.
The analysis considers both visual and audio content.`,
  category: "media",
  searchKeywords: ["video", "analyze", "question", "ai", "insight"],
  requiredPermissions: ["media:read"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    videoId: z.string().describe("The video ID to analyze"),
    prompt: z
      .string()
      .min(1)
      .max(2000)
      .describe("Question or instruction for analyzing the video content"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const answer = await ctx.services.media.analyze({
      teamId: ctx.teamId,
      videoId: params.videoId,
      prompt: params.prompt,
    });

    return success({
      videoId: params.videoId,
      prompt: params.prompt,
      analysis: answer,
    });
  },
});

export const mediaSummaryTool = defineTool({
  name: "media_summary",
  description: `Generate a concise summary of video content.

USE THIS WHEN:
- User wants a quick overview of video content
- User needs to understand video without watching
- User is cataloging or documenting video content

RETURNS: AI-generated summary covering main topics, key points, and overall content.`,
  category: "media",
  searchKeywords: ["video", "summary", "overview", "description"],
  requiredPermissions: ["media:read"],

  parameters: z.object({
    videoId: z.string().describe("The video ID to summarize"),
    prompt: z
      .string()
      .optional()
      .describe("Optional custom instructions for summary style or focus"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const summary = await ctx.services.media.getSummary({
      teamId: ctx.teamId,
      videoId: params.videoId,
      prompt: params.prompt,
    });

    return success({
      videoId: params.videoId,
      summary,
    });
  },
});
