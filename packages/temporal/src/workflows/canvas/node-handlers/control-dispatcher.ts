import type { ExecutionPlanNode } from "@openplane/types/canvas";

export type { ParallelMapHandlerParams } from "./parallel-map";
export { handleParallelMapNode } from "./parallel-map";
export type { ParallelSplitHandlerParams } from "./parallel-split";
export { handleParallelSplitNode } from "./parallel-split";
export type { RetryHandlerParams } from "./retry";
export { handleRetryNode } from "./retry";
export type { SubWorkflowHandlerParams } from "./sub-workflow";
export { handleSubWorkflowNode } from "./sub-workflow";
export type { TryCatchHandlerParams } from "./try-catch";
export { handleTryCatchNode } from "./try-catch";

export interface ControlNodeHandlerMap {
  approval: (
    node: ExecutionPlanNode,
    currentPayload: unknown,
    context: unknown
  ) => Promise<unknown>;
  input: (
    node: ExecutionPlanNode,
    currentPayload: unknown,
    context: unknown
  ) => Promise<unknown>;
  sub_workflow: typeof import("./sub-workflow").handleSubWorkflowNode;
  try_catch: typeof import("./try-catch").handleTryCatchNode;
  retry: typeof import("./retry").handleRetryNode;
  parallel_split: typeof import("./parallel-split").handleParallelSplitNode;
  parallel_map: typeof import("./parallel-map").handleParallelMapNode;
}
