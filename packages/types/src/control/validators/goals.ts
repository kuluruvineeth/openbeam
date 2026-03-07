import { z } from "zod";
import { GOAL_LEVELS, GOAL_STATUSES } from "../goals";

export const CreateControlGoalInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).nullable().optional(),
  level: z.enum(GOAL_LEVELS).optional().default("TASK"),
  status: z.enum(GOAL_STATUSES).optional().default("PLANNED"),
  parentId: z.string().min(1).nullable().optional(),
  ownerAgentId: z.string().min(1).nullable().optional(),
});

export type CreateControlGoalInput = z.infer<
  typeof CreateControlGoalInputSchema
>;

export const UpdateControlGoalInputSchema =
  CreateControlGoalInputSchema.partial();

export type UpdateControlGoalInput = z.infer<
  typeof UpdateControlGoalInputSchema
>;
