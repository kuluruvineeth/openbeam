import { z } from "zod";

export const SyncHistoryStatusSchema = z.enum([
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export type SyncHistoryStatus = z.infer<typeof SyncHistoryStatusSchema>;

export const SyncTypeSchema = z.enum(["FULL", "INCREMENTAL", "PERMISSIONS"]);

export type SyncType = z.infer<typeof SyncTypeSchema>;
