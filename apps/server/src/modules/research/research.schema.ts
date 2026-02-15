import { z } from "@hono/zod-openapi";

export const workflowIdParamsSchema = z.object({
  workflowId: z.string().openapi({
    param: {
      name: "workflowId",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const startResearchBodySchema = z.object({
  prompt: z.string().min(1).max(10_000),
  options: z
    .object({
      maxSteps: z.number().int().min(1).max(500).optional(),
    })
    .optional(),
});

export const startResearchResponseSchema = z.object({
  workflowId: z.string(),
  status: z.string(),
});

export const progressResponseSchema = z.object({
  workflowId: z.string(),
  status: z.string(),
  progress: z.number(),
  currentStep: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

export const artifactsResponseSchema = z.object({
  workflowId: z.string(),
  artifacts: z.array(z.unknown()),
  output: z.string().nullable(),
  pullRequestUrl: z.string().nullable(),
});

export const cancelResponseSchema = z.object({
  success: z.boolean(),
  workflowId: z.string(),
  status: z.string(),
});

export const errorSchema = z.object({
  error: z.string(),
});
