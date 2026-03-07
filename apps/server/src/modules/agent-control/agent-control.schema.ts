import { z } from "@hono/zod-openapi";

export const AgentIdParam = z.object({
  agentId: z.string().openapi({ param: { name: "agentId", in: "path" } }),
});

export const IssueIdParam = z.object({
  issueId: z.string().openapi({ param: { name: "issueId", in: "path" } }),
});

export const RunIdParam = z.object({
  runId: z.string().openapi({ param: { name: "runId", in: "path" } }),
});

export const ListIssuesQuery = z.object({
  status: z
    .string()
    .optional()
    .openapi({
      param: { name: "status", in: "query" },
    }),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .openapi({
      param: { name: "limit", in: "query" },
    }),
  offset: z.coerce
    .number()
    .min(0)
    .optional()
    .openapi({
      param: { name: "offset", in: "query" },
    }),
});

export const CheckoutBody = z.object({
  runId: z.string(),
  agentNameKey: z.string(),
  expectedStatuses: z.array(z.string()).optional(),
});

export const CommentBody = z.object({
  body: z.string().min(1),
});

export const UpdateIssueBody = z.object({
  status: z.string().optional(),
  title: z.string().optional(),
  priority: z.string().optional(),
  assigneeAgentId: z.string().nullable().optional(),
});

export const WakeupBody = z.object({
  agentId: z.string(),
  source: z.enum(["TIMER", "ASSIGNMENT", "ON_DEMAND", "AUTOMATION"]).optional(),
  reason: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().optional(),
});

export const StatusUpdateBody = z.object({
  status: z.enum(["IDLE", "RUNNING", "PAUSED"]),
});

export const RunEventBody = z.object({
  agentId: z.string(),
  seq: z.number().int().min(0),
  eventType: z.string(),
  stream: z.string().optional(),
  level: z.string().optional(),
  message: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const CompleteRunBody = z.object({
  agentId: z.string(),
  wakeupRequestId: z.string(),
  exitCode: z.number().int().optional(),
  signal: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  sessionId: z.string().optional(),
  resultJson: z.unknown().optional(),
  usage: z
    .object({
      inputTokens: z.number().int().optional(),
      outputTokens: z.number().int().optional(),
      cachedInputTokens: z.number().int().optional(),
    })
    .optional(),
});

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
