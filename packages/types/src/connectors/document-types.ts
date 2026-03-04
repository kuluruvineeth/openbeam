import { z } from "zod";

export const DocumentTypeCategorySchema = z.enum([
  "message",
  "email",
  "file",
  "folder",
  "document",
  "spreadsheet",
  "presentation",
  "image",
  "issue",
  "ticket",
  "pull_request",
  "task",
  "event",
  "page",
  "comment",
  "channel",
  "device",
  "alert",
  "sensor",
  "automation",
  "unknown",
]);

export type DocumentTypeCategory = z.infer<typeof DocumentTypeCategorySchema>;
