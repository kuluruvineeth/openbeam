import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "dead_letter",
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["critical", "high", "normal", "low"]);

export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().positive().default(3),
  baseDelayMs: z.number().int().positive().default(1000),
  maxDelayMs: z.number().int().positive().default(60_000),
  backoffMultiplier: z.number().positive().default(2),
  jitterFactor: z.number().min(0).max(1).default(0.1),
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

const RETRY_POLICY_DEFAULTS = RetryPolicySchema.parse({});

export const TaskDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  status: TaskStatusSchema.default("pending"),
  priority: TaskPrioritySchema.default("normal"),
  retryPolicy: RetryPolicySchema.default(RETRY_POLICY_DEFAULTS),
  attempts: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive().default(3),
  scheduledAt: z.number().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  failedAt: z.number().optional(),
  lastError: z.string().optional(),
  cronExpression: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

export type TaskHandler = (payload: Record<string, unknown>) => Promise<void>;

export function calculateBackoffMs(
  attempt: number,
  policy: RetryPolicy
): number {
  const delay = Math.min(
    policy.baseDelayMs * policy.backoffMultiplier ** attempt,
    policy.maxDelayMs
  );
  const jitter = delay * policy.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(delay + jitter));
}
