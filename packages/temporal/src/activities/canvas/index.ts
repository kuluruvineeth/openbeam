import type { Database } from "@openbeam/db";
import { createCanvasApprovalActivity } from "./approval-node";
import { createExecuteCanvasNodeActivity } from "./execute-node";
import {
  createCreateCanvasExecutionStepActivity,
  createUpdateCanvasExecutionStepActivity,
} from "./execution-step";
import { createExecuteLoopNodeActivity } from "./loop-node";
import { createExecuteParallelJoinNodeActivity } from "./parallel-join-node";
import {
  createExecuteParallelMapNodeActivity,
  createResolveParallelMapBatchActivity,
  createStoreParallelMapOutputActivity,
} from "./parallel-map-node";
import { createExecuteParallelSplitNodeActivity } from "./parallel-split-node";
import {
  createPrepareSubWorkflowExecutionActivity,
  createResolveSubWorkflowOutputActivity,
} from "./sub-workflow-node";
import type { CanvasExecutionActivities } from "./types";
import { createUpdateCanvasExecutionActivity } from "./update-execution";

export interface CanvasExecutionActivityDependencies {
  db: Database;
  maxInlineBytes?: number;
}

export function createCanvasExecutionActivities(
  deps: CanvasExecutionActivityDependencies
): CanvasExecutionActivities {
  return {
    executeCanvasNode: createExecuteCanvasNodeActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    createCanvasExecutionStep: createCreateCanvasExecutionStepActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    updateCanvasExecutionStep: createUpdateCanvasExecutionStepActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    createCanvasApproval: createCanvasApprovalActivity({ db: deps.db }),
    executeLoopNode: createExecuteLoopNodeActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    executeParallelSplitNode: createExecuteParallelSplitNodeActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    executeParallelJoinNode: createExecuteParallelJoinNodeActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    executeParallelMapNode: createExecuteParallelMapNodeActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    resolveParallelMapBatch: createResolveParallelMapBatchActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    storeParallelMapOutput: createStoreParallelMapOutputActivity({
      db: deps.db,
      maxInlineBytes: deps.maxInlineBytes,
    }),
    prepareSubWorkflowExecution: createPrepareSubWorkflowExecutionActivity({
      db: deps.db,
    }),
    resolveSubWorkflowOutput: createResolveSubWorkflowOutputActivity(),
    updateCanvasExecution: createUpdateCanvasExecutionActivity({ db: deps.db }),
  };
}

export type {
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
  LoopIterationError,
  LoopState,
  ParallelJoinBranchResult,
  ParallelSplitBranchInput,
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
export type { CanvasExecutionActivities } from "./types";
