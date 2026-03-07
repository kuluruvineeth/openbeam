import type {
  ExecutionDataRef,
  ExecutionPlanNode,
  ExecutionStatus,
  ExecutionTrace,
  StepExecution,
} from "@openbeam/types/canvas";

function isExecutionDataRef(value: unknown): value is ExecutionDataRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as Record<string, unknown>).id === "string" &&
    "storage" in value &&
    (value as Record<string, unknown>).storage === "db"
  );
}

export function createInitialTrace(
  input: {
    executionId: string;
    agentCanvasId: string;
  },
  startedAt: number
): ExecutionTrace {
  return {
    id: input.executionId,
    agentCanvasId: input.agentCanvasId,
    status: "RUNNING",
    steps: [],
    startedAt,
  };
}

export function buildStepInput(
  input: unknown,
  inputRef: StepExecution["inputRef"]
): { input?: unknown; inputRef?: StepExecution["inputRef"] } {
  if (inputRef) {
    return { inputRef };
  }

  if (input !== undefined && !isExecutionDataRef(input)) {
    return { input };
  }

  return {};
}

export function buildCompletedStep(
  node: ExecutionPlanNode,
  input: unknown,
  result: {
    output?: unknown;
    outputRef?: StepExecution["outputRef"];
    inputRef?: StepExecution["inputRef"];
    startedAt: number;
    completedAt: number;
    latencyMs: number;
  }
): StepExecution {
  return {
    nodeId: node.id,
    nodeType: node.type,
    status: "COMPLETED",
    ...buildStepInput(input, result.inputRef),
    output: result.outputRef ? undefined : result.output,
    outputRef: result.outputRef,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    latencyMs: result.latencyMs,
  };
}

export function buildFailedStep(params: {
  node: ExecutionPlanNode;
  input: unknown;
  error: string;
  startedAt: number;
  completedAt: number;
}): StepExecution {
  const inputRef = isExecutionDataRef(params.input) ? params.input : undefined;

  return {
    nodeId: params.node.id,
    nodeType: params.node.type,
    status: "FAILED",
    ...buildStepInput(params.input, inputRef),
    error: params.error,
    startedAt: params.startedAt,
    completedAt: params.completedAt,
    latencyMs: params.completedAt - params.startedAt,
  };
}

export function buildWaitingStep(params: {
  node: ExecutionPlanNode;
  input: unknown;
  inputRef: StepExecution["inputRef"];
  status: ExecutionStatus;
  startedAt: number;
}): StepExecution {
  return {
    nodeId: params.node.id,
    nodeType: params.node.type,
    status: params.status,
    ...buildStepInput(params.input, params.inputRef),
    startedAt: params.startedAt,
  };
}

export function updateTraceForInput(
  trace: ExecutionTrace,
  step: StepExecution
): void {
  if (trace.inputRef || trace.input !== undefined) {
    return;
  }

  if (step.inputRef) {
    trace.inputRef = step.inputRef;
    trace.input = undefined;
    return;
  }

  if (step.input !== undefined) {
    trace.input = step.input;
  }
}

export function updateTraceForOutput(
  trace: ExecutionTrace,
  step: StepExecution
): void {
  if (step.outputRef) {
    trace.outputRef = step.outputRef;
    trace.output = undefined;
    return;
  }

  if (step.output !== undefined) {
    trace.output = step.output;
    trace.outputRef = undefined;
  }
}
