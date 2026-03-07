import type {
  CreateCanvasApprovalInput,
  CreateCanvasApprovalOutput,
  CreateCanvasExecutionStepInput,
  CreateCanvasExecutionStepOutput,
  ExecuteCanvasNodeInput,
  ExecuteCanvasNodeOutput,
  ExecuteLoopNodeInput,
  ExecuteLoopNodeOutput,
  ExecuteParallelJoinNodeInput,
  ExecuteParallelJoinNodeOutput,
  ExecuteParallelMapNodeInput,
  ExecuteParallelMapNodeOutput,
  ExecuteParallelSplitNodeInput,
  ExecuteParallelSplitNodeOutput,
  PrepareSubWorkflowExecutionInput,
  PrepareSubWorkflowExecutionOutput,
  ResolveParallelMapBatchInput,
  ResolveParallelMapBatchOutput,
  ResolveSubWorkflowOutput,
  ResolveSubWorkflowOutputInput,
  StoreParallelMapOutputInput,
  StoreParallelMapOutputOutput,
  UpdateCanvasExecutionInput,
  UpdateCanvasExecutionStepInput,
  UpdateCanvasExecutionStepOutput,
} from "@openbeam/types/temporal";

export interface CanvasExecutionActivities {
  executeCanvasNode(
    input: ExecuteCanvasNodeInput
  ): Promise<ExecuteCanvasNodeOutput>;
  createCanvasExecutionStep(
    input: CreateCanvasExecutionStepInput
  ): Promise<CreateCanvasExecutionStepOutput>;
  updateCanvasExecutionStep(
    input: UpdateCanvasExecutionStepInput
  ): Promise<UpdateCanvasExecutionStepOutput>;
  createCanvasApproval(
    input: CreateCanvasApprovalInput
  ): Promise<CreateCanvasApprovalOutput>;
  executeLoopNode(input: ExecuteLoopNodeInput): Promise<ExecuteLoopNodeOutput>;
  executeParallelSplitNode(
    input: ExecuteParallelSplitNodeInput
  ): Promise<ExecuteParallelSplitNodeOutput>;
  executeParallelJoinNode(
    input: ExecuteParallelJoinNodeInput
  ): Promise<ExecuteParallelJoinNodeOutput>;
  executeParallelMapNode(
    input: ExecuteParallelMapNodeInput
  ): Promise<ExecuteParallelMapNodeOutput>;
  resolveParallelMapBatch(
    input: ResolveParallelMapBatchInput
  ): Promise<ResolveParallelMapBatchOutput>;
  storeParallelMapOutput(
    input: StoreParallelMapOutputInput
  ): Promise<StoreParallelMapOutputOutput>;
  prepareSubWorkflowExecution(
    input: PrepareSubWorkflowExecutionInput
  ): Promise<PrepareSubWorkflowExecutionOutput>;
  resolveSubWorkflowOutput(
    input: ResolveSubWorkflowOutputInput
  ): Promise<ResolveSubWorkflowOutput>;
  updateCanvasExecution(input: UpdateCanvasExecutionInput): Promise<void>;
}
