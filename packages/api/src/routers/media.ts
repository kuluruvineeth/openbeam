import { mediaAIService, mediaMetadataService } from "@openbeam/services";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const vespaIdSchema = z.object({
  vespaId: z.string().min(1),
  forceRefresh: z.boolean().optional().default(false),
});

const askSchema = z.object({
  mediaId: z.string().min(1),
  question: z.string().min(1),
});

const regenerateSchema = z.object({
  vespaId: z.string().min(1),
  contentTypes: z
    .array(z.enum(["chapters", "highlights", "summary", "transcript"]))
    .min(1),
});

export const mediaRouter = createTRPCRouter({
  getChapters: withActiveTeam.input(vespaIdSchema).query(async ({ input }) => {
    const chapters = await mediaMetadataService.getChapters(
      input.vespaId,
      input.forceRefresh
    );
    return { chapters };
  }),

  getHighlights: withActiveTeam
    .input(vespaIdSchema)
    .query(async ({ input }) => {
      const highlights = await mediaMetadataService.getHighlights(
        input.vespaId,
        input.forceRefresh
      );
      return { highlights };
    }),

  getTranscript: withActiveTeam
    .input(vespaIdSchema)
    .query(async ({ input }) => {
      const segments = await mediaMetadataService.getTranscriptSegments(
        input.vespaId,
        input.forceRefresh
      );
      return { segments };
    }),

  getSummary: withActiveTeam.input(vespaIdSchema).query(async ({ input }) => {
    const summary = await mediaMetadataService.getSummary(
      input.vespaId,
      input.forceRefresh
    );
    return { summary };
  }),

  getMetadata: withActiveTeam.input(vespaIdSchema).query(async ({ input }) => {
    const metadata = await mediaMetadataService.getMediaMetadata(input.vespaId);
    return metadata;
  }),

  regenerate: withActiveTeam
    .input(regenerateSchema)
    .mutation(async ({ input }) => {
      const result = await mediaMetadataService.regenerateContent(
        input.vespaId,
        input.contentTypes
      );
      return result;
    }),

  ask: withActiveTeam.input(askSchema).mutation(async ({ input }) => {
    const result = await mediaAIService.analyzeMedia(
      input.mediaId,
      input.question
    );
    return result;
  }),
});
