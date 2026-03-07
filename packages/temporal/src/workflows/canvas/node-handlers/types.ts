import type {
  ExecutionPlan,
  ExecutionPlanNode,
  ExecutionTrace,
} from "@openbeam/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
  CreateCanvasApprovalInput,
  CreateCanvasApprovalOutput,
  CreateCanvasExecutionStepInput,
  CreateCanvasExecutionStepOutput,
  ExecuteCanvasNodeInput,
  ExecuteCanvasNodeOutput,
  LoopState,
  UpdateCanvasExecutionInput,
  UpdateCanvasExecutionStepInput,
  UpdateCanvasExecutionStepOutput,
} from "@openbeam/types/temporal";
import type { AgentCanvasExecutionInput } from "@openbeam/types/temporal/workflows";
import type { ExecutionContext } from "../utils/execution";

export interface NodeActivities {
  executeNode(input: ExecuteCanvasNodeInput): Promise<ExecuteCanvasNodeOutput>;
  createStep(
    input: CreateCanvasExecutionStepInput
  ): Promise<CreateCanvasExecutionStepOutput>;
  updateStep(
    input: UpdateCanvasExecutionStepInput
  ): Promise<UpdateCanvasExecutionStepOutput>;
  createApproval(
    input: CreateCanvasApprovalInput
  ): Promise<CreateCanvasApprovalOutput>;
  updateExecution(input: UpdateCanvasExecutionInput): Promise<void>;
}

export interface CanvasExecutionState {
  paused: boolean;
  cancelled: boolean;
}

export interface NodeHandlerContext {
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
  executionContext: ExecutionContext;
  trace: ExecutionTrace;
  state: CanvasExecutionState;
  startedAt: number;
  input: AgentCanvasExecutionInput;
  activities: NodeActivities;
  approvalResponses: Map<string, CanvasApprovalSignalPayload>;
  inputResponses: Map<string, CanvasInputSignalPayload>;
  loopStates: Map<string, LoopState>;
  loopStack: string[];
}

export interface NodeExecutionResult {
  nextNodeId: string | null;
  output: unknown;
  cancelled: boolean;
}

export type NodeHandler = (
  node: ExecutionPlanNode,
  currentPayload: unknown,
  context: NodeHandlerContext
) => Promise<NodeExecutionResult>;

export interface RunExecutionParams {
  startNodeId: string | null;
  input: unknown;
  stopNodeIds?: Set<string>;
  loopStates: Map<string, LoopState>;
  loopStack: string[];
}

export interface RunExecutionResult {
  output: unknown;
  cancelled: boolean;
  stoppedAt?: string | null;
}

export type RunExecutionFn = (
  params: RunExecutionParams
) => Promise<RunExecutionResult>;
