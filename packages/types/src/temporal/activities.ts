import { z } from "zod";
import { ExecutionPlanNodeSchema } from "../canvas/compiler";
import {
  ExecutionContextSchema,
  ExecutionDataRefSchema,
  ExecutionStatusSchema,
  ExecutionTraceSchema,
} from "../canvas/execution";
import { CanvasStateSchema } from "../canvas/state";
import { SyncCursorSchema } from "./workflows";

export const FetchBatchInputSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  cursor: SyncCursorSchema.optional(),
  batchSize: z.number(),
});

export type FetchBatchInput = z.infer<typeof FetchBatchInputSchema>;

export const FetchBatchOutputSchema = z.object({
  items: z.array(z.unknown()),
  nextCursor: SyncCursorSchema.optional(),
  hasMore: z.boolean(),
  rateLimitRemaining: z.number().optional(),
});

export type FetchBatchOutput = z.infer<typeof FetchBatchOutputSchema>;

export const UpdateSyncProgressInputSchema = z.object({
  connectorId: z.string(),
  processed: z.number(),
  cursor: SyncCursorSchema.optional(),
});

export type UpdateSyncProgressInput = z.infer<
  typeof UpdateSyncProgressInputSchema
>;

export const CompleteSyncJobInputSchema = z.object({
  connectorId: z.string(),
  processed: z.number(),
  indexed: z.number(),
  cursor: SyncCursorSchema.optional(),
});

export type CompleteSyncJobInput = z.infer<typeof CompleteSyncJobInputSchema>;

export const ParseDocumentInputSchema = z.object({
  path: z.string(),
  mimeType: z.string(),
});

export type ParseDocumentInput = z.infer<typeof ParseDocumentInputSchema>;

export const ParseDocumentOutputSchema = z.object({
  documentId: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type ParseDocumentOutput = z.infer<typeof ParseDocumentOutputSchema>;

export const ChunkOutputSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type ChunkOutput = z.infer<typeof ChunkOutputSchema>;

export const ActivityEmbeddedChunkSchema = ChunkOutputSchema.extend({
  embedding: z.array(z.number()),
});

export type ActivityEmbeddedChunk = z.infer<typeof ActivityEmbeddedChunkSchema>;

export const BulkIndexOutputSchema = z.object({
  indexed: z.number(),
  errors: z.number(),
});

export type BulkIndexOutput = z.infer<typeof BulkIndexOutputSchema>;

export const ActivityMediaSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  transcription: z.string(),
  scenes: z.array(z.string()),
});

export type ActivityMediaSegment = z.infer<typeof ActivityMediaSegmentSchema>;

export const ProcessMediaOutputSchema = z.object({
  segments: z.array(ActivityMediaSegmentSchema),
  duration: z.number(),
});

export type ProcessMediaOutput = z.infer<typeof ProcessMediaOutputSchema>;

export const ProcessWebhookEventOutputSchema = z.object({
  action: z.enum(["sync_document", "delete_document", "ignore"]),
  documentIds: z.array(z.string()),
});

export type ProcessWebhookEventOutput = z.infer<
  typeof ProcessWebhookEventOutputSchema
>;

export const ExecuteAgentStepOutputSchema = z.object({
  artifacts: z.array(z.unknown()),
  checkpoint: z.object({
    step: z.number(),
    state: z.record(z.string(), z.unknown()),
    timestamp: z.number(),
  }),
  complete: z.boolean(),
});

export type ExecuteAgentStepOutput = z.infer<
  typeof ExecuteAgentStepOutputSchema
>;

export const ExecuteCanvasNodeInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  node: ExecutionPlanNodeSchema,
  input: z.unknown().optional(),
  context: ExecutionContextSchema.optional(),
});

export type ExecuteCanvasNodeInput = z.infer<
  typeof ExecuteCanvasNodeInputSchema
>;

export const ExecuteCanvasNodeOutputSchema = z.object({
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
  inputRef: ExecutionDataRefSchema.optional(),
  startedAt: z.number(),
  completedAt: z.number(),
  latencyMs: z.number(),
});

export type ExecuteCanvasNodeOutput = z.infer<
  typeof ExecuteCanvasNodeOutputSchema
>;

export const CreateCanvasExecutionStepInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  node: ExecutionPlanNodeSchema,
  input: z.unknown().optional(),
  status: ExecutionStatusSchema,
  startedAt: z.number().optional(),
});

export type CreateCanvasExecutionStepInput = z.infer<
  typeof CreateCanvasExecutionStepInputSchema
>;

export const CreateCanvasExecutionStepOutputSchema = z.object({
  stepId: z.string(),
  inputRef: ExecutionDataRefSchema.optional(),
});

export type CreateCanvasExecutionStepOutput = z.infer<
  typeof CreateCanvasExecutionStepOutputSchema
>;

export const UpdateCanvasExecutionStepInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  stepId: z.string(),
  nodeId: z.string(),
  status: ExecutionStatusSchema,
  output: z.unknown().optional(),
  error: z.string().optional(),
  completedAt: z.number().optional(),
  latencyMs: z.number().optional(),
});

export type UpdateCanvasExecutionStepInput = z.infer<
  typeof UpdateCanvasExecutionStepInputSchema
>;

export const UpdateCanvasExecutionStepOutputSchema = z.object({
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
});

export type UpdateCanvasExecutionStepOutput = z.infer<
  typeof UpdateCanvasExecutionStepOutputSchema
>;

export const CreateCanvasApprovalInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string().optional(),
  nodeId: z.string(),
  requestMessage: z.string().optional(),
  timeoutMs: z.number().optional(),
});

export type CreateCanvasApprovalInput = z.infer<
  typeof CreateCanvasApprovalInputSchema
>;

export const CreateCanvasApprovalOutputSchema = z.object({
  approvalId: z.string(),
  expiresAt: z.number().optional(),
});

export type CreateCanvasApprovalOutput = z.infer<
  typeof CreateCanvasApprovalOutputSchema
>;

export const PrepareSubWorkflowExecutionInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string().optional(),
  node: ExecutionPlanNodeSchema,
  input: z.unknown().optional(),
  context: ExecutionContextSchema.optional(),
});

export type PrepareSubWorkflowExecutionInput = z.infer<
  typeof PrepareSubWorkflowExecutionInputSchema
>;

export const PrepareSubWorkflowExecutionOutputSchema = z.object({
  executionId: z.string(),
  agentCanvasId: z.string(),
  versionNumber: z.number(),
  canvas: CanvasStateSchema,
  input: z.unknown().optional(),
  waitForCompletion: z.boolean(),
  timeoutMs: z.number().optional(),
  outputMappings: z.record(z.string(), z.string()).optional(),
});

export type PrepareSubWorkflowExecutionOutput = z.infer<
  typeof PrepareSubWorkflowExecutionOutputSchema
>;

export const ResolveSubWorkflowOutputInputSchema = z.object({
  teamId: z.string().optional(),
  agentCanvasId: z.string().optional(),
  output: z.unknown().optional(),
  mappings: z.record(z.string(), z.string()),
});

export type ResolveSubWorkflowOutputInput = z.infer<
  typeof ResolveSubWorkflowOutputInputSchema
>;

export const ResolveSubWorkflowOutputSchema = z.object({
  output: z.unknown().optional(),
});

export type ResolveSubWorkflowOutput = z.infer<
  typeof ResolveSubWorkflowOutputSchema
>;

export const LoopStateSchema = z.object({
  nodeId: z.string(),
  type: z.enum(["forEach", "while", "times"]),
  startedAt: z.number(),
  iteration: z.number().int().nonnegative(),
  index: z.number().int().nonnegative(),
  initialInputRef: ExecutionDataRefSchema.optional(),
  collectionRef: ExecutionDataRefSchema.optional(),
  collectionSize: z.number().int().nonnegative().optional(),
  resultsRef: ExecutionDataRefSchema.optional(),
  errorsRef: ExecutionDataRefSchema.optional(),
  lastOutputRef: ExecutionDataRefSchema.optional(),
  resultRefs: z.array(ExecutionDataRefSchema).optional(),
  errorRefs: z.array(ExecutionDataRefSchema).optional(),
});

export type LoopState = z.infer<typeof LoopStateSchema>;

export const LoopIterationErrorSchema = z.object({
  message: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  iteration: z.number().int().nonnegative(),
  index: z.number().int().nonnegative().optional(),
  occurredAt: z.number().int().nonnegative(),
});

export type LoopIterationError = z.infer<typeof LoopIterationErrorSchema>;

export const ExecuteLoopNodeInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  node: ExecutionPlanNodeSchema,
  input: z.unknown().optional(),
  loopState: LoopStateSchema.optional(),
  iterationError: LoopIterationErrorSchema.optional(),
});

export type ExecuteLoopNodeInput = z.infer<typeof ExecuteLoopNodeInputSchema>;

export const ExecuteLoopNodeOutputSchema = z.object({
  branchId: z.enum(["body", "done"]),
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
  inputRef: ExecutionDataRefSchema.optional(),
  loopState: LoopStateSchema.optional(),
  startedAt: z.number(),
  completedAt: z.number(),
  latencyMs: z.number(),
});

export type ExecuteLoopNodeOutput = z.infer<typeof ExecuteLoopNodeOutputSchema>;

export const ParallelSplitBranchInputSchema = z.object({
  branchId: z.string(),
  input: z.unknown().optional(),
  inputRef: ExecutionDataRefSchema.optional(),
});

export type ParallelSplitBranchInput = z.infer<
  typeof ParallelSplitBranchInputSchema
>;

export const ExecuteParallelSplitNodeInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  node: ExecutionPlanNodeSchema,
  input: z.unknown().optional(),
});

export type ExecuteParallelSplitNodeInput = z.infer<
  typeof ExecuteParallelSplitNodeInputSchema
>;

export const ExecuteParallelSplitNodeOutputSchema = z.object({
  output: z.object({
    branches: z.array(ParallelSplitBranchInputSchema),
  }),
  inputRef: ExecutionDataRefSchema.optional(),
  startedAt: z.number(),
  completedAt: z.number(),
  latencyMs: z.number(),
});

export type ExecuteParallelSplitNodeOutput = z.infer<
  typeof ExecuteParallelSplitNodeOutputSchema
>;

export const ParallelJoinBranchResultSchema = z.object({
  branchId: z.string(),
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
  error: z.string().optional(),
});

export type ParallelJoinBranchResult = z.infer<
  typeof ParallelJoinBranchResultSchema
>;

export const ExecuteParallelJoinNodeInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  node: ExecutionPlanNodeSchema,
  branches: z.array(ParallelJoinBranchResultSchema),
});

export type ExecuteParallelJoinNodeInput = z.infer<
  typeof ExecuteParallelJoinNodeInputSchema
>;

export const ExecuteParallelJoinNodeOutputSchema = z.object({
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
  inputRef: ExecutionDataRefSchema.optional(),
  startedAt: z.number(),
  completedAt: z.number(),
  latencyMs: z.number(),
});

export type ExecuteParallelJoinNodeOutput = z.infer<
  typeof ExecuteParallelJoinNodeOutputSchema
>;

export const ExecuteParallelMapNodeInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  node: ExecutionPlanNodeSchema,
  input: z.unknown().optional(),
});

export type ExecuteParallelMapNodeInput = z.infer<
  typeof ExecuteParallelMapNodeInputSchema
>;

export const ExecuteParallelMapNodeOutputSchema = z.object({
  collectionRef: ExecutionDataRefSchema,
  collectionSize: z.number().int().nonnegative(),
  inputRef: ExecutionDataRefSchema.optional(),
  startedAt: z.number(),
  completedAt: z.number(),
  latencyMs: z.number(),
});

export type ExecuteParallelMapNodeOutput = z.infer<
  typeof ExecuteParallelMapNodeOutputSchema
>;

export const ResolveParallelMapBatchInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  collectionRef: ExecutionDataRefSchema,
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive().optional(),
});

export type ResolveParallelMapBatchInput = z.infer<
  typeof ResolveParallelMapBatchInputSchema
>;

export const ResolveParallelMapBatchOutputSchema = z.object({
  items: z.array(z.unknown()),
});

export type ResolveParallelMapBatchOutput = z.infer<
  typeof ResolveParallelMapBatchOutputSchema
>;

export const StoreParallelMapOutputInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  nodeId: z.string(),
  output: z.unknown().optional(),
});

export type StoreParallelMapOutputInput = z.infer<
  typeof StoreParallelMapOutputInputSchema
>;

export const StoreParallelMapOutputOutputSchema = z.object({
  output: z.unknown().optional(),
  outputRef: ExecutionDataRefSchema.optional(),
  startedAt: z.number(),
  completedAt: z.number(),
  latencyMs: z.number(),
});

export type StoreParallelMapOutputOutput = z.infer<
  typeof StoreParallelMapOutputOutputSchema
>;

export const UpdateCanvasExecutionInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  status: ExecutionStatusSchema.optional(),
  currentNodeId: z.string().nullable().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  trace: ExecutionTraceSchema.optional(),
  tokenUsage: z.unknown().optional(),
  latencyMs: z.number().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  workflowId: z.string().optional(),
  runId: z.string().optional(),
  temporalStatus: z.string().optional(),
  historyEventCount: z.number().optional(),
  historySizeBytes: z.number().optional(),
  continueAsNewCount: z.number().optional(),
});

export type UpdateCanvasExecutionInput = z.infer<
  typeof UpdateCanvasExecutionInputSchema
>;

export const EvaluateCanvasExecutionInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  canvasId: z.string(),
});

export type EvaluateCanvasExecutionInput = z.infer<
  typeof EvaluateCanvasExecutionInputSchema
>;

export const EvaluateCanvasExecutionOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  dimensions: z.object({
    completion: z.number().min(0).max(100),
    efficiency: z.number().min(0).max(100),
    errorRate: z.number().min(0).max(100),
    latency: z.number().min(0).max(100),
    approvalOverhead: z.number().min(0).max(100),
  }),
  flags: z.array(z.string()),
});

export type EvaluateCanvasExecutionOutput = z.infer<
  typeof EvaluateCanvasExecutionOutputSchema
>;
