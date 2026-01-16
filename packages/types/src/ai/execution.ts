import { z } from "zod";
import { FinishReasonSchema, TokenUsageSchema } from "./completion";

export const AgentTypeSchema = z.enum([
  "llm",
  "sequential",
  "parallel",
  "coordinator",
  "loop",
  "generator-critic",
  "human-in-loop",
  "hierarchical",
]);

export type AgentType = z.infer<typeof AgentTypeSchema>;

export const ExecutionStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "skipped",
]);

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const ToolCallRecordSchema = z.object({
  name: z.string(),
  input: z.unknown(),
  output: z.unknown().optional(),
  timestamp: z.number(),
  durationMs: z.number().optional(),
});

export type ToolCallRecord = z.infer<typeof ToolCallRecordSchema>;

export const ExecutionTraceSchema: z.ZodType<ExecutionTrace> = z.lazy(() =>
  z.object({
    agentName: z.string(),
    type: AgentTypeSchema,
    startTime: z.number(),
    endTime: z.number().optional(),
    status: ExecutionStatusSchema,
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    error: z.string().optional(),
    children: z.array(ExecutionTraceSchema),
    tokenUsage: TokenUsageSchema.optional(),
    toolCalls: z.array(ToolCallRecordSchema).optional(),
  })
);

export type ExecutionTrace = {
  agentName: string;
  type: AgentType;
  startTime: number;
  endTime?: number;
  status: ExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  children: ExecutionTrace[];
  tokenUsage?: { inputTokens: number; outputTokens: number };
  toolCalls?: ToolCallRecord[];
};

export const AgentStateSnapshotSchema = z.object({
  agentName: z.string(),
  outputKey: z.string(),
  value: z.unknown(),
  timestamp: z.number(),
});

export type AgentStateSnapshot = z.infer<typeof AgentStateSnapshotSchema>;

export const AgentStateSchema = z.object({
  values: z.map(z.string(), z.unknown()),
  history: z.array(AgentStateSnapshotSchema),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export const AgentExecutionResultSchema = z.object({
  output: z.unknown(),
  trace: ExecutionTraceSchema,
  finishReason: FinishReasonSchema,
  totalTokens: TokenUsageSchema,
  durationMs: z.number().nonnegative(),
});

export type AgentExecutionResult = z.infer<typeof AgentExecutionResultSchema>;

export const AgentExecutionContextSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  accessControl: z.array(z.string()).optional(),
  parentTrace: ExecutionTraceSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentExecutionContext = z.infer<typeof AgentExecutionContextSchema>;

export const AgentStreamChunkTypeSchema = z.enum([
  "text",
  "thinking",
  "tool-call",
  "tool-result",
  "step",
  "done",
]);

export type AgentStreamChunkType = z.infer<typeof AgentStreamChunkTypeSchema>;

export const AgentStreamChunkSchema = z.object({
  type: AgentStreamChunkTypeSchema,
  agentName: z.string(),
  content: z.string().optional(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  toolInput: z.unknown().optional(),
  toolOutput: z.unknown().optional(),
  step: ExecutionTraceSchema.optional(),
  result: AgentExecutionResultSchema.optional(),
  modelDescription: z.string().optional(),
});

export type AgentStreamChunk = z.infer<typeof AgentStreamChunkSchema>;
