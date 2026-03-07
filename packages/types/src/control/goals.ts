import { z } from "zod";

export const GOAL_LEVELS = ["COMPANY", "TEAM", "AGENT", "TASK"] as const;
export const GoalLevelSchema = z.enum(GOAL_LEVELS);
export type GoalLevel = z.infer<typeof GoalLevelSchema>;

export const GOAL_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "ACHIEVED",
  "CANCELLED",
] as const;

export const GoalStatusSchema = z.enum(GOAL_STATUSES);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const ControlGoalSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  level: GoalLevelSchema,
  status: GoalStatusSchema,
  parentId: z.string().nullable(),
  ownerAgentId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlGoal = z.infer<typeof ControlGoalSchema>;
