import { z } from "@hono/zod-openapi";

export const errorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export const agentExecuteBodySchema = z.object({
  prompt: z.string().min(1).describe("The user prompt to execute"),
  agentType: z
    .enum(["research", "rag", "coordinator"])
    .optional()
    .default("rag")
    .describe("The type of agent to use"),
  maxSteps: z.number().min(1).max(50).optional().default(10),
  tools: z.array(z.string()).optional().describe("Specific tools to enable"),
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Additional context to pass to the agent"),
});

export const agentEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("thinking"),
    timestamp: z.number(),
    data: z.object({
      message: z.string(),
    }),
  }),
  z.object({
    type: z.literal("tool_call"),
    timestamp: z.number(),
    data: z.object({
      id: z.string(),
      name: z.string(),
      arguments: z.record(z.string(), z.unknown()),
    }),
  }),
  z.object({
    type: z.literal("tool_result"),
    timestamp: z.number(),
    data: z.object({
      id: z.string(),
      success: z.boolean(),
      result: z.unknown().optional(),
      error: z.string().optional(),
      latencyMs: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("text"),
    timestamp: z.number(),
    data: z.object({
      content: z.string(),
      isPartial: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal("status"),
    timestamp: z.number(),
    data: z.object({
      message: z.string(),
      step: z.number().optional(),
      totalSteps: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("complete"),
    timestamp: z.number(),
    data: z.object({
      success: z.boolean(),
      output: z.unknown().optional(),
      citations: z.array(z.unknown()).optional(),
      metrics: z
        .object({
          totalDurationMs: z.number(),
          toolCalls: z.number(),
          inputTokens: z.number().optional(),
          outputTokens: z.number().optional(),
        })
        .optional(),
    }),
  }),
  z.object({
    type: z.literal("error"),
    timestamp: z.number(),
    data: z.object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean().optional(),
    }),
  }),
]);

export type AgentExecuteBody = z.infer<typeof agentExecuteBodySchema>;
export type AgentEvent = z.infer<typeof agentEventSchema>;
