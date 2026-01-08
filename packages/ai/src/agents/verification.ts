import type { AgentExecutionContext, AgentExecutionResult } from "./config";

export interface VerificationCriteria {
  minGroundingScore?: number;
  requiredFields?: string[];
  maxTokens?: number;
  customValidator?: (result: AgentExecutionResult) => VerificationCheck;
}

export interface VerificationCheck {
  passed: boolean;
  reason?: string;
  score?: number;
  suggestions?: string[];
}

export interface AgentVerificationConfig<T = unknown> {
  task: string;
  tools: string[];
  maxIterations: number;
  verificationCriteria: VerificationCriteria;
  onProgress?: (step: AgentVerificationStep) => void;
  context?: T;
}

export interface AgentVerificationStep {
  iteration: number;
  phase: "gather" | "execute" | "verify" | "refine";
  message?: string;
  output?: unknown;
  verification?: VerificationCheck;
}

export interface AgentVerificationResult<T = unknown> {
  success: boolean;
  output: T | null;
  steps: AgentVerificationStep[];
  metrics: {
    totalIterations: number;
    totalTokens: number;
    totalDurationMs: number;
    verificationAttempts: number;
    successfulVerifications: number;
  };
  verification: {
    passed: boolean;
    score: number;
    failedCriteria: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface VerificationContext {
  task: string;
  previousOutputs: unknown[];
  feedbackHistory: string[];
  currentIteration: number;
}

export function gatherContext(
  config: AgentVerificationConfig,
  previousSteps: AgentVerificationStep[]
): VerificationContext {
  return {
    task: config.task,
    previousOutputs: previousSteps
      .filter((s) => s.output !== undefined)
      .map((s) => s.output),
    feedbackHistory: previousSteps
      .filter((s) => s.verification && !s.verification.passed)
      .flatMap((s) => s.verification?.suggestions ?? []),
    currentIteration: previousSteps.length,
  };
}

function checkGroundingScore(
  result: AgentExecutionResult,
  minScore: number
): VerificationCheck {
  const output = result.output as { groundingScore?: number } | null;
  const score = output?.groundingScore ?? 0;
  const passed = score >= minScore;

  return {
    passed,
    score,
    reason: passed
      ? undefined
      : `Grounding score ${score} below minimum ${minScore}`,
    suggestions: passed
      ? undefined
      : [
          "Add more citations from source documents",
          "Verify claims against sources",
        ],
  };
}

function checkRequiredFields(
  result: AgentExecutionResult,
  requiredFields: string[]
): VerificationCheck {
  const output = result.output as Record<string, unknown> | null;
  const missingFields = requiredFields.filter(
    (field) => output?.[field] === undefined || output?.[field] === null
  );
  const passed = missingFields.length === 0;

  return {
    passed,
    reason: passed
      ? undefined
      : `Missing required fields: ${missingFields.join(", ")}`,
    suggestions: passed
      ? undefined
      : missingFields.map((f) => `Include ${f} in the response`),
  };
}

function checkTokenLimit(
  result: AgentExecutionResult,
  maxTokens: number
): VerificationCheck {
  const totalTokens =
    result.totalTokens.inputTokens + result.totalTokens.outputTokens;
  const passed = totalTokens <= maxTokens;

  return {
    passed,
    reason: passed
      ? undefined
      : `Token usage ${totalTokens} exceeds maximum ${maxTokens}`,
    suggestions: passed
      ? undefined
      : ["Reduce response length", "Use more concise language"],
  };
}

function aggregateChecks(checks: VerificationCheck[]): VerificationCheck {
  const allPassed = checks.every((c) => c.passed);
  const scoredChecks = checks.filter((c) => c.score !== undefined);
  const avgScore =
    scoredChecks.length > 0
      ? scoredChecks.reduce((sum, c) => sum + (c.score ?? 0), 0) /
        scoredChecks.length
      : 1;

  return {
    passed: allPassed,
    reason: checks.find((c) => !c.passed)?.reason,
    score: avgScore,
    suggestions: checks.flatMap((c) => c.suggestions ?? []),
  };
}

export function verifyWork(
  result: AgentExecutionResult,
  criteria: VerificationCriteria
): VerificationCheck {
  const checks: VerificationCheck[] = [];

  if (criteria.minGroundingScore !== undefined) {
    checks.push(checkGroundingScore(result, criteria.minGroundingScore));
  }

  if (criteria.requiredFields?.length) {
    checks.push(checkRequiredFields(result, criteria.requiredFields));
  }

  if (criteria.maxTokens !== undefined) {
    checks.push(checkTokenLimit(result, criteria.maxTokens));
  }

  if (criteria.customValidator) {
    checks.push(criteria.customValidator(result));
  }

  return aggregateChecks(checks);
}

export function buildFeedbackPrompt(
  originalTask: string,
  verification: VerificationCheck
): string {
  const lines = [
    "Previous attempt did not meet verification criteria.",
    "",
    `Reason: ${verification.reason ?? "Unknown"}`,
    "",
    "Suggestions for improvement:",
  ];

  for (const suggestion of verification.suggestions ?? []) {
    lines.push(`- ${suggestion}`);
  }

  lines.push("");
  lines.push(`Original task: ${originalTask}`);
  lines.push("");
  lines.push("Please try again, addressing the feedback above.");

  return lines.join("\n");
}

interface VerificationMetrics {
  totalIterations: number;
  totalTokens: number;
  totalDurationMs: number;
  verificationAttempts: number;
  successfulVerifications: number;
}

function createStep(
  iteration: number,
  phase: AgentVerificationStep["phase"],
  message: string,
  verification?: VerificationCheck
): AgentVerificationStep {
  return { iteration, phase, message, verification };
}

function getTaskForIteration(
  config: AgentVerificationConfig,
  steps: AgentVerificationStep[]
): string {
  const lastFailedVerification = steps
    .filter((s) => s.verification && !s.verification.passed)
    .pop()?.verification;

  if (!lastFailedVerification) {
    return config.task;
  }
  return buildFeedbackPrompt(config.task, lastFailedVerification);
}

function buildSuccessResult<T>(
  output: T,
  steps: AgentVerificationStep[],
  metrics: VerificationMetrics,
  score: number
): AgentVerificationResult<T> {
  return {
    success: true,
    output,
    steps,
    metrics,
    verification: { passed: true, score, failedCriteria: [] },
  };
}

function buildFailureResult<T>(
  output: T | null,
  steps: AgentVerificationStep[],
  metrics: VerificationMetrics,
  error: { code: string; message: string }
): AgentVerificationResult<T> {
  const lastVerification = steps.findLast((s) => s.verification);
  const failedCriteria: string[] = [];
  if (lastVerification?.verification?.reason) {
    failedCriteria.push(lastVerification.verification.reason);
  }

  return {
    success: false,
    output,
    steps,
    metrics,
    verification: {
      passed: false,
      score: lastVerification?.verification?.score ?? 0,
      failedCriteria,
    },
    error,
  };
}

export async function executeAgentWithVerification<T = unknown>(
  config: AgentVerificationConfig<T>,
  context: AgentExecutionContext,
  executeAgent: (
    task: string,
    tools: string[],
    ctx: AgentExecutionContext
  ) => Promise<AgentExecutionResult>
): Promise<AgentVerificationResult<T>> {
  const startTime = performance.now();
  const steps: AgentVerificationStep[] = [];
  let totalTokens = 0;
  let verificationAttempts = 0;
  let successfulVerifications = 0;
  let lastResult: AgentExecutionResult | null = null;

  const getMetrics = (): VerificationMetrics => ({
    totalIterations: steps.filter((s) => s.phase === "execute").length,
    totalTokens,
    totalDurationMs: performance.now() - startTime,
    verificationAttempts,
    successfulVerifications,
  });

  for (let iteration = 0; iteration < config.maxIterations; iteration += 1) {
    const gatherStep = createStep(
      iteration,
      "gather",
      `Gathering context for iteration ${iteration + 1}`
    );
    steps.push(gatherStep);
    config.onProgress?.(gatherStep);

    const task = getTaskForIteration(config, steps);

    const executeStep = createStep(
      iteration,
      "execute",
      `Executing agent for iteration ${iteration + 1}`
    );
    steps.push(executeStep);
    config.onProgress?.(executeStep);

    try {
      lastResult = await executeAgent(task, config.tools, context);
      totalTokens +=
        lastResult.totalTokens.inputTokens +
        lastResult.totalTokens.outputTokens;
      executeStep.output = lastResult.output;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return buildFailureResult<T>(null, steps, getMetrics(), {
        code: "EXECUTION_ERROR",
        message: errorMessage,
      });
    }

    verificationAttempts += 1;

    const verifyStep = createStep(
      iteration,
      "verify",
      `Verifying result for iteration ${iteration + 1}`
    );
    steps.push(verifyStep);
    config.onProgress?.(verifyStep);

    const verification = verifyWork(lastResult, config.verificationCriteria);
    verifyStep.verification = verification;

    if (verification.passed) {
      successfulVerifications += 1;
      return buildSuccessResult<T>(
        lastResult.output as T,
        steps,
        getMetrics(),
        verification.score ?? 1
      );
    }

    const refineStep = createStep(
      iteration,
      "refine",
      `Refining based on feedback: ${verification.reason}`,
      verification
    );
    steps.push(refineStep);
    config.onProgress?.(refineStep);
  }

  return buildFailureResult<T>(
    lastResult?.output as T | null,
    steps,
    getMetrics(),
    {
      code: "MAX_ITERATIONS",
      message: `Failed to pass verification after ${config.maxIterations} attempts`,
    }
  );
}
