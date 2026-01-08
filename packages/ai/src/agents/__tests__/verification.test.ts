import { describe, expect, it } from "bun:test";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentState,
} from "../config";
import {
  type AgentVerificationConfig,
  type AgentVerificationStep,
  buildFeedbackPrompt,
  executeAgentWithVerification,
  gatherContext,
  verifyWork,
} from "../verification";

const mockState: AgentState = {
  values: new Map(),
  history: [],
};

const mockContext: AgentExecutionContext = {
  teamId: "test-team",
  userId: "test-user",
  state: mockState,
};

function createMockResult(
  output: unknown,
  tokens = { inputTokens: 100, outputTokens: 50 }
): AgentExecutionResult {
  return {
    output,
    state: mockState,
    trace: {
      agentName: "test",
      type: "llm",
      startTime: Date.now(),
      status: "completed",
      children: [],
    },
    finishReason: "stop",
    totalTokens: tokens,
    durationMs: 100,
  };
}

describe("verifyWork", () => {
  it("passes when grounding score meets threshold", () => {
    const result = createMockResult({ groundingScore: 0.85, answer: "test" });
    const check = verifyWork(result, { minGroundingScore: 0.7 });

    expect(check.passed).toBe(true);
    expect(check.score).toBe(0.85);
  });

  it("fails when grounding score below threshold", () => {
    const result = createMockResult({ groundingScore: 0.5, answer: "test" });
    const check = verifyWork(result, { minGroundingScore: 0.7 });

    expect(check.passed).toBe(false);
    expect(check.reason).toContain("Grounding score");
    expect(check.suggestions).toBeDefined();
  });

  it("checks required fields", () => {
    const result = createMockResult({ answer: "test" });
    const check = verifyWork(result, {
      requiredFields: ["answer", "citations"],
    });

    expect(check.passed).toBe(false);
    expect(check.reason).toContain("citations");
  });

  it("passes when all required fields present", () => {
    const result = createMockResult({ answer: "test", citations: [] });
    const check = verifyWork(result, {
      requiredFields: ["answer", "citations"],
    });

    expect(check.passed).toBe(true);
  });

  it("checks token limits", () => {
    const result = createMockResult(
      {},
      { inputTokens: 1000, outputTokens: 500 }
    );
    const check = verifyWork(result, { maxTokens: 1000 });

    expect(check.passed).toBe(false);
    expect(check.reason).toContain("Token usage");
  });

  it("supports custom validator", () => {
    const result = createMockResult({ custom: "value" });
    const check = verifyWork(result, {
      customValidator: (r) => ({
        passed: (r.output as { custom: string }).custom === "value",
        score: 1,
      }),
    });

    expect(check.passed).toBe(true);
  });

  it("preserves zero scores correctly", () => {
    const result = createMockResult({ groundingScore: 0 });
    const check = verifyWork(result, { minGroundingScore: 0.5 });

    expect(check.passed).toBe(false);
    expect(check.score).toBe(0);
  });

  it("uses default score of 1 when no scored checks exist", () => {
    const result = createMockResult({ answer: "test" });
    const check = verifyWork(result, {
      requiredFields: ["answer"],
    });

    expect(check.passed).toBe(true);
    expect(check.score).toBe(1);
  });
});

describe("gatherContext", () => {
  it("collects previous outputs", () => {
    const config: AgentVerificationConfig = {
      task: "test task",
      tools: ["search"],
      maxIterations: 3,
      verificationCriteria: {},
    };

    const steps: AgentVerificationStep[] = [
      { iteration: 0, phase: "execute", output: { result: 1 } },
      { iteration: 1, phase: "execute", output: { result: 2 } },
    ];

    const ctx = gatherContext(config, steps);

    expect(ctx.previousOutputs).toHaveLength(2);
    expect(ctx.task).toBe("test task");
  });

  it("collects feedback from failed verifications", () => {
    const config: AgentVerificationConfig = {
      task: "test task",
      tools: [],
      maxIterations: 3,
      verificationCriteria: {},
    };

    const steps: AgentVerificationStep[] = [
      {
        iteration: 0,
        phase: "verify",
        verification: {
          passed: false,
          suggestions: ["Add citations"],
        },
      },
    ];

    const ctx = gatherContext(config, steps);

    expect(ctx.feedbackHistory).toContain("Add citations");
  });
});

describe("buildFeedbackPrompt", () => {
  it("includes reason and suggestions", () => {
    const prompt = buildFeedbackPrompt("Write a summary", {
      passed: false,
      reason: "Grounding score too low",
      suggestions: ["Add more citations", "Verify claims"],
    });

    expect(prompt).toContain("Grounding score too low");
    expect(prompt).toContain("Add more citations");
    expect(prompt).toContain("Write a summary");
  });
});

describe("executeAgentWithVerification", () => {
  it("succeeds on first attempt when verification passes", async () => {
    const config: AgentVerificationConfig = {
      task: "test task",
      tools: ["search"],
      maxIterations: 3,
      verificationCriteria: { minGroundingScore: 0.7 },
    };

    const result = await executeAgentWithVerification(
      config,
      mockContext,
      async () => createMockResult({ groundingScore: 0.9, answer: "test" })
    );

    expect(result.success).toBe(true);
    expect(result.metrics.totalIterations).toBe(1);
    expect(result.verification.passed).toBe(true);
  });

  it("retries when verification fails", async () => {
    const config: AgentVerificationConfig = {
      task: "test task",
      tools: ["search"],
      maxIterations: 3,
      verificationCriteria: { minGroundingScore: 0.7 },
    };

    let attempts = 0;

    const result = await executeAgentWithVerification(
      config,
      mockContext,
      async () => {
        attempts += 1;
        const score = attempts === 2 ? 0.85 : 0.5;
        return await Promise.resolve(
          createMockResult({ groundingScore: score, answer: "test" })
        );
      }
    );

    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
    expect(result.metrics.totalIterations).toBe(2);
  });

  it("fails after max iterations", async () => {
    const config: AgentVerificationConfig = {
      task: "test task",
      tools: ["search"],
      maxIterations: 2,
      verificationCriteria: { minGroundingScore: 0.9 },
    };

    const result = await executeAgentWithVerification(
      config,
      mockContext,
      async () => createMockResult({ groundingScore: 0.5, answer: "test" })
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MAX_ITERATIONS");
    expect(result.metrics.totalIterations).toBe(2);
  });

  it("calls onProgress callback", async () => {
    const progressCalls: AgentVerificationStep[] = [];

    const config: AgentVerificationConfig = {
      task: "test task",
      tools: [],
      maxIterations: 1,
      verificationCriteria: {},
      onProgress: (step) => progressCalls.push(step),
    };

    await executeAgentWithVerification(config, mockContext, async () =>
      createMockResult({ answer: "test" })
    );

    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls.some((s) => s.phase === "gather")).toBe(true);
    expect(progressCalls.some((s) => s.phase === "execute")).toBe(true);
    expect(progressCalls.some((s) => s.phase === "verify")).toBe(true);
  });
});
