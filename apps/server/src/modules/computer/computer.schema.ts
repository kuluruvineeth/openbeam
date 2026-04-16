import { z } from "@hono/zod-openapi";

export const errorSchema = z.object({ error: z.string() });

export const agentIdParamsSchema = z.object({
  agentId: z.string().openapi({ param: { name: "agentId", in: "path" } }),
});

export const runIdParamsSchema = z.object({
  agentId: z.string().openapi({ param: { name: "agentId", in: "path" } }),
  runId: z.string().openapi({ param: { name: "runId", in: "path" } }),
});

export const catalogResponseSchema = z.object({
  data: z.array(
    z.object({
      templateId: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string(),
      scheduleCron: z.string().nullable(),
    })
  ),
});

export const agentResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    source: z.string(),
    templateId: z.string().nullable(),
    status: z.string(),
    mode: z.string(),
    scheduleCron: z.string().nullable(),
    createdAt: z.string(),
  }),
});

export const agentListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().nullable(),
      source: z.string(),
      status: z.string(),
      mode: z.string(),
      scheduleCron: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
});

export const enableAgentBodySchema = z.object({
  templateId: z.string(),
});

export const triggerRunResponseSchema = z.object({
  data: z.object({ runId: z.string() }),
});

export const runListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      summary: z.string().nullable(),
      error: z.string().nullable(),
      toolCallCount: z.number(),
      llmCallCount: z.number(),
      startedAt: z.string().nullable(),
      completedAt: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
});

export const approveBodySchema = z.object({
  approvedIndices: z.array(z.number().int().min(0)).optional(),
});

export const approveResponseSchema = z.object({
  data: z.object({
    runId: z.string(),
    status: z.string(),
    actionsQueued: z.number(),
  }),
});

export const rejectResponseSchema = z.object({
  data: z.object({ runId: z.string(), status: z.string() }),
});

export const memoryListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      content: z.string(),
      type: z.string().nullable(),
      updatedAt: z.string(),
    })
  ),
});
