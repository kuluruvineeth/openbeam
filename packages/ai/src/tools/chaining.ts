import type { ToolExecutionResult } from "@openplane/types/ai";
import { toolRegistry } from "./registry";
import type { ToolContext, ToolExecutionOptions } from "./types";

export interface ToolChainStep<TInput = unknown, TOutput = unknown> {
  toolName: string;
  params:
    | Record<string, unknown>
    | ((previousOutput: TInput) => Record<string, unknown>);
  continueOnError?: boolean;
  transform?: (result: ToolExecutionResult<TOutput>) => unknown;
}

export interface StepResult<T = unknown> {
  stepIndex: number;
  toolName: string;
  success: boolean;
  output: T | null;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  durationMs: number;
}

export interface ChainResult<T = unknown> {
  success: boolean;
  finalOutput: T | null;
  steps: StepResult[];
  failedAt: number | null;
  totalDurationMs: number;
  stepsCompleted: number;
}

export interface ChainContext extends ToolContext {
  previousOutputs: unknown[];
  currentStepIndex: number;
}

interface StepError {
  code: string;
  message: string;
  retryable: boolean;
}

function resolveParams(
  step: ToolChainStep,
  previousOutput: unknown
): Record<string, unknown> {
  if (typeof step.params === "function") {
    return step.params(previousOutput);
  }
  return step.params;
}

function createErrorResult(
  stepIndex: number,
  toolName: string,
  error: StepError,
  durationMs: number
): StepResult {
  return {
    stepIndex,
    toolName,
    success: false,
    output: null,
    error,
    durationMs,
  };
}

function createSuccessResult(
  stepIndex: number,
  toolName: string,
  output: unknown,
  durationMs: number
): StepResult {
  return {
    stepIndex,
    toolName,
    success: true,
    output,
    durationMs,
  };
}

async function executeStepTool(
  step: ToolChainStep,
  stepIndex: number,
  currentOutput: unknown
): Promise<{ result: ToolExecutionResult; params: Record<string, unknown> }> {
  const registered = toolRegistry.get(step.toolName);
  if (!registered) {
    throw new Error(`Tool not found: ${step.toolName}`);
  }

  const executeFn = registered.coreTool.execute;
  if (!executeFn) {
    throw new Error(`Tool ${step.toolName} has no execute function`);
  }

  const params = resolveParams(step, currentOutput);
  const execOptions: ToolExecutionOptions = {
    toolCallId: `chain-${stepIndex}-${Date.now()}`,
    messages: [],
  };

  const result = (await executeFn(params, execOptions)) as ToolExecutionResult;
  return { result, params };
}

function handleToolNotFound(
  stepIndex: number,
  toolName: string,
  stepStartTime: number
): StepResult {
  return createErrorResult(
    stepIndex,
    toolName,
    {
      code: "NOT_FOUND",
      message: `Tool not found: ${toolName}`,
      retryable: false,
    },
    performance.now() - stepStartTime
  );
}

function handleToolSuccess(
  step: ToolChainStep,
  stepIndex: number,
  result: ToolExecutionResult,
  stepDuration: number
): { stepResult: StepResult; output: unknown } {
  const transformedOutput = step.transform
    ? step.transform(result)
    : result.data;
  return {
    stepResult: createSuccessResult(
      stepIndex,
      step.toolName,
      transformedOutput,
      stepDuration
    ),
    output: transformedOutput,
  };
}

function handleToolFailure(
  step: ToolChainStep,
  stepIndex: number,
  result: ToolExecutionResult,
  stepDuration: number
): StepResult {
  const error = result.error
    ? {
        code: result.error.code,
        message: result.error.message,
        retryable: result.error.retryable,
      }
    : { code: "UNKNOWN", message: "Unknown error", retryable: false };
  return createErrorResult(stepIndex, step.toolName, error, stepDuration);
}

function handleException(
  step: ToolChainStep,
  stepIndex: number,
  error: unknown,
  stepDuration: number
): StepResult {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return createErrorResult(
    stepIndex,
    step.toolName,
    { code: "INTERNAL_ERROR", message: errorMessage, retryable: true },
    stepDuration
  );
}

interface ProcessStepResult {
  stepResult: StepResult;
  newOutput?: unknown;
  shouldBreak: boolean;
}

async function processStep(
  step: ToolChainStep,
  stepIndex: number,
  currentOutput: unknown
): Promise<ProcessStepResult> {
  const stepStartTime = performance.now();

  if (!toolRegistry.get(step.toolName)) {
    return {
      stepResult: handleToolNotFound(stepIndex, step.toolName, stepStartTime),
      shouldBreak: !step.continueOnError,
    };
  }

  try {
    const { result, params } = await executeStepTool(
      step,
      stepIndex,
      currentOutput
    );
    const stepDuration = performance.now() - stepStartTime;
    toolRegistry.notifyExecute(step.toolName, params, result, stepDuration);

    if (result.success) {
      const { stepResult, output } = handleToolSuccess(
        step,
        stepIndex,
        result,
        stepDuration
      );
      return { stepResult, newOutput: output, shouldBreak: false };
    }

    return {
      stepResult: handleToolFailure(step, stepIndex, result, stepDuration),
      shouldBreak: !step.continueOnError,
    };
  } catch (error) {
    return {
      stepResult: handleException(
        step,
        stepIndex,
        error,
        performance.now() - stepStartTime
      ),
      shouldBreak: !step.continueOnError,
    };
  }
}

export async function executeToolChain<T = unknown>(
  steps: ToolChainStep[],
  context: ToolContext,
  initialInput?: unknown
): Promise<ChainResult<T>> {
  const startTime = performance.now();
  const stepResults: StepResult[] = [];
  let currentOutput: unknown = initialInput ?? null;
  let failedAt: number | null = null;

  toolRegistry.setCurrentContext(context);

  try {
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      if (!step) {
        continue;
      }

      const { stepResult, newOutput, shouldBreak } = await processStep(
        step,
        i,
        currentOutput
      );
      stepResults.push(stepResult);

      if (newOutput !== undefined) {
        currentOutput = newOutput;
      }

      if (shouldBreak && !stepResult.success) {
        failedAt = i;
        break;
      }
    }
  } finally {
    toolRegistry.clearCurrentContext();
  }

  const allSucceeded = failedAt === null && stepResults.every((s) => s.success);
  return {
    success: allSucceeded,
    finalOutput: allSucceeded ? (currentOutput as T) : null,
    steps: stepResults,
    failedAt,
    totalDurationMs: performance.now() - startTime,
    stepsCompleted: stepResults.length,
  };
}

export function createChainBuilder() {
  const steps: ToolChainStep[] = [];

  return {
    add<TInput = unknown, TOutput = unknown>(
      step: ToolChainStep<TInput, TOutput>
    ) {
      steps.push(step as ToolChainStep);
      return this;
    },

    build(): ToolChainStep[] {
      return [...steps];
    },

    execute<T = unknown>(
      context: ToolContext,
      initialInput?: unknown
    ): Promise<ChainResult<T>> {
      return executeToolChain<T>(steps, context, initialInput);
    },
  };
}

export const researchChain = createChainBuilder()
  .add({
    toolName: "analyze_query",
    params: (input: { query: string }) => ({ query: input.query }),
    transform: (result) => result.data,
  })
  .add({
    toolName: "search_hybrid",
    params: (analysis: { normalizedQuery: string }) => ({
      query: analysis.normalizedQuery,
      limit: 10,
    }),
    transform: (result) => result.data,
  })
  .add({
    toolName: "answer_with_chunks",
    params: (
      searchResult: { results: Array<{ id: string; snippet: string }> },
      originalQuery?: string
    ) => ({
      question: originalQuery ?? "Summarize the results",
      chunks: searchResult.results.map((r, i) => ({
        id: r.id,
        documentId: r.id,
        documentTitle: `Result ${i + 1}`,
        sourceType: "search",
        content: r.snippet ?? "",
        score: 1,
      })),
    }),
    transform: (result) => result.data,
  })
  .add({
    toolName: "verify_grounding",
    params: (answerResult: { answer: string; citations: unknown[] }) => ({
      response: answerResult.answer,
      chunks: answerResult.citations,
    }),
    transform: (result) => result.data,
  })
  .build();
