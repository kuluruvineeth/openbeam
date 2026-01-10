import { z } from "zod";

export const SearchModeSchema = z.enum([
  "bm25",
  "semantic",
  "hybrid",
  "hybrid_v2",
  "hybrid_v2_rerank",
  "enterprise_v2",
  "enterprise_v2_ltr",
  "global_sorted",
  "global_sorted_v2",
]);

export type SearchMode = z.infer<typeof SearchModeSchema>;

export const SearchRankingSchema = z.enum([
  "bm25",
  "semantic",
  "hybrid",
  "recency",
  "engagement",
]);

export type SearchRanking = z.infer<typeof SearchRankingSchema>;

export const MediaSearchRankingSchema = z.enum([
  "bm25",
  "semantic",
  "hybrid",
  "enterprise",
  "engagement",
]);

export type MediaSearchRanking = z.infer<typeof MediaSearchRankingSchema>;

export const RRFConfigSchema = z.object({
  k: z.number().min(1).max(100).default(60),
  weights: z
    .object({
      bm25: z.number().min(0).max(1).default(0.4),
      dense: z.number().min(0).max(1).default(0.4),
      sparse: z.number().min(0).max(1).default(0.2),
    })
    .default({ bm25: 0.4, dense: 0.4, sparse: 0.2 }),
});

export type RRFConfig = z.infer<typeof RRFConfigSchema>;
