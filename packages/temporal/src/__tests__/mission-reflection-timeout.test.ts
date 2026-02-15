import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createReflectionActivities,
  generateTextWithTimeout,
} from "../activities/mission/reflection";

const heartbeatSpy = vi.fn();

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat: heartbeatSpy,
    }),
  },
}));

describe("generateTextWithTimeout", () => {
  beforeEach(() => {
    heartbeatSpy.mockClear();
  });

  it("aborts when timeout fires", async () => {
    const generateText = vi.fn(
      (_prompt: string, _system: string, signal?: AbortSignal) =>
        new Promise<string>((_resolve, reject) => {
          if (signal?.aborted) {
            reject(new Error("aborted"));
            return;
          }
          signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );

    await expect(
      generateTextWithTimeout("prompt", "system", generateText, 50)
    ).rejects.toThrow("aborted");
  });

  it("calls heartbeat before and after successful LLM call", async () => {
    const generateText = vi.fn().mockResolvedValue('{"result": "ok"}');

    const result = await generateTextWithTimeout(
      "prompt",
      "system",
      generateText,
      5000
    );

    expect(result).toBe('{"result": "ok"}');
    expect(heartbeatSpy).toHaveBeenCalledTimes(2);
    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_started" });
    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_completed" });
  });

  it("cleans up timeout even when generateText rejects", async () => {
    const generateText = vi.fn().mockRejectedValue(new Error("LLM error"));

    await expect(
      generateTextWithTimeout("prompt", "system", generateText, 5000)
    ).rejects.toThrow("LLM error");

    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_started" });
    expect(heartbeatSpy).toHaveBeenCalledTimes(1);
  });

  it("passes abort signal to generateText function", async () => {
    const generateText = vi.fn(
      (_prompt: string, _system: string, signal?: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        expect(signal?.aborted).toBe(false);
        return Promise.resolve("done");
      }
    );

    await generateTextWithTimeout("prompt", "system", generateText, 5000);
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});

describe("reflection activities propagate timeout", () => {
  beforeEach(() => {
    heartbeatSpy.mockClear();
  });

  function createMockDb() {
    return {
      missionTask: { update: vi.fn(), findMany: vi.fn() },
      missionComment: { create: vi.fn() },
    };
  }

  it("evaluateProgress heartbeats around LLM call", async () => {
    const generateText = vi.fn().mockResolvedValue(`{
      "progressScore": 0.6,
      "confidenceScore": 0.7,
      "stuckIndicators": {
        "repeatingActions": false,
        "noNewArtifacts": false,
        "errorLoop": false,
        "progressPlateau": false
      },
      "reasoning": "Good progress",
      "suggestedAction": "continue"
    }`);

    const activities = createReflectionActivities({
      db: createMockDb() as never,
      generateText,
    });

    await activities.evaluateProgress({
      missionId: "m1",
      taskId: "t1",
      agentId: "a1",
      currentStep: 3,
      maxSteps: 10,
      recentArtifacts: [],
      reflectionBuffer: [],
      taskContext: { title: "Test", description: null },
    });

    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_started" });
    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_completed" });
  });

  it("generateReplan heartbeats around LLM call", async () => {
    const generateText = vi.fn().mockResolvedValue(`{
      "newApproach": "Try a different strategy",
      "strategyShift": "Changed approach",
      "adjustedPrompt": "New prompt",
      "reasoning": "Prior approach failed"
    }`);

    const activities = createReflectionActivities({
      db: createMockDb() as never,
      generateText,
    });

    await activities.generateReplan({
      missionId: "m1",
      taskId: "t1",
      agentId: "a1",
      currentApproach: "old approach",
      reflectionBuffer: [],
      failurePatterns: [],
      taskContext: {
        title: "Test",
        description: null,
        priorAttempts: 1,
      },
    });

    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_started" });
    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_completed" });
  });

  it("criticReview heartbeats around LLM call", async () => {
    const generateText = vi.fn().mockResolvedValue(`{
      "passed": true,
      "qualityScore": 0.8,
      "issues": [],
      "recommendation": "accept"
    }`);

    const activities = createReflectionActivities({
      db: createMockDb() as never,
      generateText,
    });

    await activities.criticReview({
      missionId: "m1",
      taskId: "t1",
      agentId: "a1",
      artifacts: [
        { id: "a1", type: "text", content: "output", createdAt: Date.now() },
      ],
      taskContext: { title: "Test", description: null },
    });

    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_started" });
    expect(heartbeatSpy).toHaveBeenCalledWith({ phase: "llm_call_completed" });
  });
});
