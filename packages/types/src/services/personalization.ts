import { z } from "zod";

export const PersonalizationContextSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  sessionId: z.string().optional(),
  recentQueries: z.array(z.string()).optional(),
  recentDocuments: z.array(z.string()).optional(),
});

export type PersonalizationContext = z.infer<
  typeof PersonalizationContextSchema
>;

export const ResolvedUserProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string().optional(),
  email: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  recentActivity: z
    .array(
      z.object({
        type: z.string(),
        resourceId: z.string(),
        timestamp: z.date(),
      })
    )
    .optional(),
});

export type ResolvedUserProfile = z.infer<typeof ResolvedUserProfileSchema>;

export const PersonalizationScoresSchema = z.object({
  relevanceBoost: z.number(),
  recencyBoost: z.number(),
  expertiseBoost: z.number(),
  collaborationBoost: z.number(),
});

export type PersonalizationScores = z.infer<typeof PersonalizationScoresSchema>;

export const DocumentForScoringSchema = z.object({
  id: z.string(),
  authorId: z.string().optional(),
  collaborators: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type DocumentForScoring = z.infer<typeof DocumentForScoringSchema>;
