import { z } from "zod";

export const UserJourneyStageSchema = z.enum([
  "TOURIST",
  "EVALUATOR",
  "ADOPTER",
  "POWER",
]);
export type UserJourneyStage = z.infer<typeof UserJourneyStageSchema>;

const STAGE_THRESHOLDS: [number, UserJourneyStage][] = [
  [51, "POWER"],
  [11, "ADOPTER"],
  [4, "EVALUATOR"],
  [0, "TOURIST"],
];

export function stageFromCount(queryCount: number): UserJourneyStage {
  for (const [threshold, stage] of STAGE_THRESHOLDS) {
    if (queryCount >= threshold) {
      return stage;
    }
  }
  return "TOURIST";
}

export const OnboardingStateSchema = z.object({
  queryCount: z.number().int().min(0),
  stage: UserJourneyStageSchema,
  discoveredCaps: z.array(z.string()),
  streakDays: z.number().int().min(0),
  lastStreakDate: z.string().nullable(),
  resolvedCount: z.number().int().min(0),
  unresolvedCount: z.number().int().min(0),
});
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

export const CapabilityHintSchema = z.object({
  id: z.string(),
  trigger: z.enum([
    "post_search",
    "post_action",
    "query_milestone",
    "post_zero_results",
    "repeated_query",
    "connector_mention",
  ]),
  message: z.string(),
  actionLabel: z.string().optional(),
  cooldownDays: z.number().int().positive(),
  maxShows: z.number().int().positive(),
  stages: z.array(UserJourneyStageSchema),
});
export type CapabilityHint = z.infer<typeof CapabilityHintSchema>;

export const BriefingSectionItemSchema = z.object({
  title: z.string(),
  snippet: z.string().optional(),
  url: z.string().optional(),
  source: z.string().optional(),
  importance: z.enum(["high", "medium", "low"]).optional(),
});
export type BriefingSectionItem = z.infer<typeof BriefingSectionItemSchema>;

export const BriefingSectionSchema = z.object({
  title: z.string(),
  items: z.array(BriefingSectionItemSchema),
});
export type BriefingSection = z.infer<typeof BriefingSectionSchema>;

export const BriefingResponseSchema = z.object({
  sections: z.array(BriefingSectionSchema),
  metadata: z.object({
    docCount: z.number(),
    connectorCount: z.number(),
    generatedAt: z.string(),
  }),
});
export type BriefingResponse = z.infer<typeof BriefingResponseSchema>;
