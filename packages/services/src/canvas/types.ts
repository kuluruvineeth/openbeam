import type {
  ExecutionContext,
  ExecutionPlanNode,
} from "@openplane/types/canvas";

export type CanvasNodeExecutionInput = {
  node: ExecutionPlanNode;
  input: unknown;
  context?: ExecutionContext;
};

export type CanvasNodeExecutor = (
  input: CanvasNodeExecutionInput
) => Promise<unknown> | unknown;
