import { z } from "zod";

export const ExpertiseUpdateSchema = z.object({
  userId: z.string(),
  topicId: z.string(),
  score: z.number(),
  evidence: z.array(z.string()),
  lastUpdated: z.date(),
});

export type ExpertiseUpdate = z.infer<typeof ExpertiseUpdateSchema>;

export const ResolvedEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["user", "team", "project", "topic"]),
  aliases: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ResolvedEntity = z.infer<typeof ResolvedEntitySchema>;

export const ResolutionContextSchema = z.object({
  teamId: z.string(),
  workspaceId: z.string(),
  query: z.string(),
  entities: z.array(ResolvedEntitySchema),
});

export type ResolutionContext = z.infer<typeof ResolutionContextSchema>;
