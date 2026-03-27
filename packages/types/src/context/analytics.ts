import { z } from "zod";
import { ContextTypeSchema } from "./enums";

export const ContextAnalyticsSchema = z.object({
  totalEntries: z.number().int().nonnegative(),
  entriesByType: z.record(ContextTypeSchema, z.number().int().nonnegative()),
  entriesByCategory: z.record(z.string(), z.number().int().nonnegative()),
  totalSessions: z.number().int().nonnegative(),
  totalMemories: z.number().int().nonnegative(),
  averageHotnessScore: z.number().nonnegative(),
  topAccessed: z.array(
    z.object({
      uri: z.string(),
      abstractText: z.string(),
      activeCount: z.number().int().nonnegative(),
    })
  ),
  recentlyCreated: z.array(
    z.object({
      uri: z.string(),
      abstractText: z.string(),
      createdAt: z.coerce.date(),
    })
  ),
  memoryGrowthRate: z.number(),
  retrievalStats: z.object({
    totalSearches: z.number().int().nonnegative(),
    averageResultCount: z.number().nonnegative(),
    averageLatencyMs: z.number().nonnegative(),
    zeroResultRate: z.number().min(0).max(1),
  }),
});
export type ContextAnalytics = z.infer<typeof ContextAnalyticsSchema>;
