import { videoAIService, videoMetadataService } from "@openplane/services";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const vespaIdSchema = z.object({
  vespaId: z.string().min(1),
  forceRefresh: z.boolean().optional().default(false),
});

const askSchema = z.object({
  videoId: z.string().min(1),
  question: z.string().min(1),
});

const regenerateSchema = z.object({
  vespaId: z.string().min(1),
  contentTypes: z
    .array(z.enum(["chapters", "highlights", "summary", "transcript"]))
    .min(1),
});

export const videoRouter = createTRPCRouter({
  getChapters: withActiveTeam.input(vespaIdSchema).query(async ({ input }) => {
    const chapters = await videoMetadataService.getChapters(
      input.vespaId,
      input.forceRefresh
    );
    return { chapters };
  }),

  getHighlights: withActiveTeam
    .input(vespaIdSchema)
    .query(async ({ input }) => {
      const highlights = await videoMetadataService.getHighlights(
        input.vespaId,
        input.forceRefresh
      );
      return { highlights };
    }),

  getTranscript: withActiveTeam
    .input(vespaIdSchema)
    .query(async ({ input }) => {
      const segments = await videoMetadataService.getTranscriptSegments(
        input.vespaId,
        input.forceRefresh
      );
      return { segments };
    }),

  getSummary: withActiveTeam.input(vespaIdSchema).query(async ({ input }) => {
    const summary = await videoMetadataService.getSummary(
      input.vespaId,
      input.forceRefresh
    );
    return { summary };
  }),

  getMetadata: withActiveTeam.input(vespaIdSchema).query(async ({ input }) => {
    const metadata = await videoMetadataService.getVideoMetadata(input.vespaId);
    return metadata;
  }),

  regenerate: withActiveTeam
    .input(regenerateSchema)
    .mutation(async ({ input }) => {
      const result = await videoMetadataService.regenerateContent(
        input.vespaId,
        input.contentTypes
      );
      return result;
    }),

  ask: withActiveTeam.input(askSchema).mutation(async ({ input }) => {
    const result = await videoAIService.analyzeVideo(
      input.videoId,
      input.question
    );
    return result;
  }),
});
