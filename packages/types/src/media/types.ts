import { z } from "zod";

export const MediaTypeSchema = z.enum([
  "meeting",
  "presentation",
  "tutorial",
  "demo",
  "interview",
  "webinar",
  "other",
]);

export type MediaType = z.infer<typeof MediaTypeSchema>;
