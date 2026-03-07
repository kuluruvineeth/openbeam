import { z } from "zod";

export const ACTIVITY_ACTOR_TYPES = ["agent", "user", "system"] as const;
export const ActivityActorTypeSchema = z.enum(ACTIVITY_ACTOR_TYPES);
export type ActivityActorType = z.infer<typeof ActivityActorTypeSchema>;

export const ACTIVITY_ENTITY_TYPES = [
  "agent",
  "issue",
  "project",
  "goal",
  "approval",
  "secret",
  "team",
] as const;

export const ActivityEntityTypeSchema = z.enum(ACTIVITY_ENTITY_TYPES);
export type ActivityEntityType = z.infer<typeof ActivityEntityTypeSchema>;

export const ControlActivityLogSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  actorType: z.string(),
  actorId: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  agentId: z.string().nullable(),
  runId: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});

export type ControlActivityLog = z.infer<typeof ControlActivityLogSchema>;
