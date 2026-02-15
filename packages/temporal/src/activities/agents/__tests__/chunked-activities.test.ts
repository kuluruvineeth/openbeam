import { beforeEach, describe, expect, it, vi } from "vitest";

const heartbeat = vi.fn();
let heartbeatDetails: unknown;

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat,
      cancellationSignal: { aborted: false },
      info: {
        heartbeatDetails,
      },
    }),
  },
}));

import { createExecuteAgentStepChunkedActivity } from "../execute-agent-step-chunked";
import { createExecuteParallelAgentStepsActivity } from "../execute-parallel-agent-steps";

describe("createExecuteAgentStepChunkedActivity", () => {
  beforeEach(() => {
    heartbeat.mockReset();
    heartbeatDetails = undefined;
  });

  it("executes chunks until completion", async () => {
    const executeChunk = vi
      .fn()
      .mockResolvedValueOnce({
        artifacts: [{ id: "a1", type: "text", content: "c1", createdAt: 1 }],
        intermediateState: { pass: 1 },
        tokensUsed: 100,
        costCents: 2,
        complete: false,
        needsMoreChunks: true,
      })
      .mockResolvedValueOnce({
        artifacts: [{ id: "a2", type: "text", content: "c2", createdAt: 2 }],
        intermediateState: { pass: 2 },
        tokensUsed: 80,
        costCents: 1,
        complete: true,
        needsMoreChunks: false,
      });
    const persistCheckpoint = vi.fn().mockResolvedValue(undefined);

    const activity = createExecuteAgentStepChunkedActivity({
      executor: { executeChunk },
      persistCheckpoint,
    });

    const result = await activity({
      sessionId: "s1",
      agentType: "mission",
      step: 1,
      previousArtifacts: [],
      context: { prompt: "test" },
      tier: "standard",
      maxChunks: 5,
      checkpointEveryNChunks: 1,
      resumeFromChunk: null,
    });

    expect(result.complete).toBe(true);
    expect(result.chunksExecuted).toBe(2);
    expect(result.tokensUsed).toBe(180);
    expect(result.costCents).toBe(3);
    expect(result.artifacts).toHaveLength(2);
    expect(heartbeat).toHaveBeenCalledTimes(2);
    expect(persistCheckpoint).toHaveBeenCalledTimes(2);
  });

  it("resumes from heartbeat details when present", async () => {
    heartbeatDetails = [
      {
        chunkIndex: 2,
        partialArtifacts: [],
        intermediateState: { resumed: true },
        tokensUsed: 50,
        costCents: 1,
        timestamp: Date.now(),
      },
    ];

    const executeChunk = vi.fn().mockResolvedValue({
      artifacts: [{ id: "a3", type: "text", content: "c3", createdAt: 3 }],
      intermediateState: { pass: 3 },
      tokensUsed: 10,
      costCents: 1,
      complete: true,
      needsMoreChunks: false,
    });
    const persistCheckpoint = vi.fn().mockResolvedValue(undefined);

    const activity = createExecuteAgentStepChunkedActivity({
      executor: { executeChunk },
      persistCheckpoint,
    });

    const result = await activity({
      sessionId: "s1",
      agentType: "mission",
      step: 1,
      previousArtifacts: [],
      context: { prompt: "test" },
      tier: "standard",
      maxChunks: 5,
      checkpointEveryNChunks: 2,
      resumeFromChunk: null,
    });

    expect(executeChunk).toHaveBeenCalledWith({
      sessionId: "s1",
      agentType: "mission",
      step: 1,
      chunkIndex: 2,
      previousOutput: expect.objectContaining({ chunkIndex: 2 }),
      context: expect.any(Object),
    });
    expect(result.chunksExecuted).toBe(3);
    expect(result.tokensUsed).toBe(60);
    expect(result.costCents).toBe(2);
  });
});

describe("createExecuteParallelAgentStepsActivity", () => {
  beforeEach(() => {
    heartbeat.mockReset();
  });

  it("executes branches and aggregates totals", async () => {
    const executeStep = vi
      .fn()
      .mockResolvedValueOnce({
        artifacts: [{ id: "b1", type: "text", content: "r1", createdAt: 1 }],
        complete: false,
        tokensUsed: 120,
        costCents: 3,
      })
      .mockResolvedValueOnce({
        artifacts: [{ id: "b2", type: "text", content: "r2", createdAt: 2 }],
        complete: true,
        tokensUsed: 80,
        costCents: 2,
      });

    const activity = createExecuteParallelAgentStepsActivity({
      executor: { executeStep },
    });

    const result = await activity({
      sessionId: "s1",
      agentType: "mission",
      step: 1,
      branches: [
        { branchId: "left", context: {}, previousArtifacts: [] },
        { branchId: "right", context: {}, previousArtifacts: [] },
      ],
    });

    expect(result.branches).toHaveLength(2);
    expect(result.totalTokensUsed).toBe(200);
    expect(result.totalCostCents).toBe(5);
    expect(heartbeat).toHaveBeenCalledTimes(2);
  });
});
