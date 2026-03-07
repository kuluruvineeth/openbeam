import { z } from "zod";

export const CONTROL_PROJECT_STATUSES = [
  "BACKLOG",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const ControlProjectStatusSchema = z.enum(CONTROL_PROJECT_STATUSES);
export type ControlProjectStatus = z.infer<typeof ControlProjectStatusSchema>;

export const ControlProjectSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  goalId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: ControlProjectStatusSchema,
  leadAgentId: z.string().nullable(),
  targetDate: z.date().nullable(),
  color: z.string().nullable(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlProject = z.infer<typeof ControlProjectSchema>;

export const ControlProjectWorkspaceSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  projectId: z.string(),
  name: z.string(),
  cwd: z.string().nullable(),
  repoUrl: z.string().nullable(),
  repoRef: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  isPrimary: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlProjectWorkspace = z.infer<
  typeof ControlProjectWorkspaceSchema
>;

export const ControlProjectGoalSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  projectId: z.string(),
  goalId: z.string(),
  createdAt: z.date(),
});

export type ControlProjectGoal = z.infer<typeof ControlProjectGoalSchema>;
