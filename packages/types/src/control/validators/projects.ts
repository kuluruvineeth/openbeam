import { z } from "zod";
import { CONTROL_PROJECT_STATUSES } from "../projects";

const projectWorkspaceFields = {
  name: z.string().min(1).max(255).optional(),
  cwd: z.string().min(1).max(1024).nullable().optional(),
  repoUrl: z.string().url().max(2048).nullable().optional(),
  repoRef: z.string().max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
};

export const CreateControlProjectWorkspaceInputSchema = z
  .object({
    ...projectWorkspaceFields,
    isPrimary: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    const hasCwd = typeof value.cwd === "string" && value.cwd.trim().length > 0;
    const hasRepo =
      typeof value.repoUrl === "string" && value.repoUrl.trim().length > 0;
    if (!(hasCwd || hasRepo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Workspace requires at least one of cwd or repoUrl",
        path: ["cwd"],
      });
    }
  });

export type CreateControlProjectWorkspaceInput = z.infer<
  typeof CreateControlProjectWorkspaceInputSchema
>;

export const UpdateControlProjectWorkspaceInputSchema = z
  .object({
    ...projectWorkspaceFields,
    isPrimary: z.boolean().optional(),
  })
  .partial();

export type UpdateControlProjectWorkspaceInput = z.infer<
  typeof UpdateControlProjectWorkspaceInputSchema
>;

const projectFields = {
  goalId: z.string().min(1).nullable().optional(),
  goalIds: z.array(z.string().min(1)).optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(10_000).nullable().optional(),
  status: z.enum(CONTROL_PROJECT_STATUSES).optional().default("BACKLOG"),
  leadAgentId: z.string().min(1).nullable().optional(),
  targetDate: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  archivedAt: z.coerce.date().nullable().optional(),
};

export const CreateControlProjectInputSchema = z.object({
  ...projectFields,
  workspace: CreateControlProjectWorkspaceInputSchema.optional(),
});

export type CreateControlProjectInput = z.infer<
  typeof CreateControlProjectInputSchema
>;

export const UpdateControlProjectInputSchema = z
  .object(projectFields)
  .partial();

export type UpdateControlProjectInput = z.infer<
  typeof UpdateControlProjectInputSchema
>;
