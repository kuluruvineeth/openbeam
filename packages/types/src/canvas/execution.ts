import { z } from "zod";

export const ExecutionStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_INPUT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
]);

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const ExecutionDataRefSchema = z.object({
  id: z.string(),
  storage: z.enum(["db"]),
  sizeBytes: z.number().int().nonnegative().optional(),
  contentType: z.string().optional(),
});

export type ExecutionDataRef = z.infer<typeof ExecutionDataRefSchema>;

export const StepExecutionSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  status: ExecutionStatusSchema,
  input: z.unknown().optional(),
  inputRef: ExecutionDataRefSchema.optional(),
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
  error: z.string().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  latencyMs: z.number().optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
});

export type StepExecution = z.infer<typeof StepExecutionSchema>;

export const ExecutionTraceSchema = z.object({
  id: z.string(),
  agentCanvasId: z.string(),
  status: ExecutionStatusSchema,
  currentNodeId: z.string().optional(),
  steps: z.array(StepExecutionSchema),
  input: z.unknown().optional(),
  inputRef: ExecutionDataRefSchema.optional(),
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
  error: z.string().optional(),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  totalLatencyMs: z.number().optional(),
  totalTokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
});

export type ExecutionTrace = z.infer<typeof ExecutionTraceSchema>;

export const ExecutionContextSchema = z.object({
  executionId: z.string(),
  agentCanvasId: z.string(),
  versionNumber: z.number().int().positive(),
  teamId: z.string(),
  triggeredById: z.string(),
  triggerSource: z.string().optional(),
  workflowId: z.string().optional(),
  runId: z.string().optional(),
  input: z.unknown().optional(),
  inputRef: ExecutionDataRefSchema.optional(),
  environment: z.record(z.string(), z.string()).optional(),
});

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;
