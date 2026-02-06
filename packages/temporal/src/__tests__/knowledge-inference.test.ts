import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAggregateMentions = vi.fn();
const mockComputeExpertiseScores = vi.fn();
const mockInferRelationships = vi.fn();
const mockDetectPatterns = vi.fn();
const mockDecayScores = vi.fn();
const mockPersistInferenceResults = vi.fn();

vi.mock("@temporalio/workflow", () => {
  const activities = {
    aggregateMentions: mockAggregateMentions,
    computeExpertiseScores: mockComputeExpertiseScores,
    inferRelationships: mockInferRelationships,
    detectPatterns: mockDetectPatterns,
    decayScores: mockDecayScores,
    persistInferenceResults: mockPersistInferenceResults,
  };

  return {
    proxyActivities: () => activities,
    workflowInfo: () => ({
      workflowId: "kg-inference:team1:daily",
      startTime: new Date("2026-02-06T02:00:00Z"),
    }),
    continueAsNew: vi.fn(),
  };
});

describe("knowledgeInferenceWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAggregateMentions.mockResolvedValue({
      entityCount: 42,
      hasMore: false,
      nextOffset: null,
      summary: {
        ent1: {
          entityId: "ent1",
          mentionCount: 10,
          sources: ["AUTHORED", "MENTIONED"],
          lastMentionedAt: Date.now(),
        },
      },
    });

    mockComputeExpertiseScores.mockResolvedValue({
      scoresUpdated: 42,
      topExperts: [{ entityId: "ent1", score: 8.5, domains: ["TypeScript"] }],
    });

    mockInferRelationships.mockResolvedValue({
      edgesCreated: 5,
      edgesUpdated: 3,
      edgesRemoved: 1,
    });

    mockDetectPatterns.mockResolvedValue({
      patternsDetected: 2,
      clusters: 2,
      communities: 2,
    });

    mockDecayScores.mockResolvedValue({
      scoresDecayed: 15,
      entitiesPruned: 3,
    });

    mockPersistInferenceResults.mockResolvedValue({ persisted: true });
  });

  it("executes finalize phase activities once aggregation is complete", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    const result = await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "daily",
      phase: "finalize",
      resumeOffset: 42,
    });

    expect(mockAggregateMentions).not.toHaveBeenCalled();
    expect(mockComputeExpertiseScores).toHaveBeenCalledOnce();
    expect(mockInferRelationships).toHaveBeenCalledOnce();
    expect(mockDetectPatterns).not.toHaveBeenCalled();
    expect(mockDecayScores).toHaveBeenCalledOnce();
    expect(mockPersistInferenceResults).toHaveBeenCalledOnce();

    expect(result).toEqual({
      teamId: "team1",
      entitiesProcessed: 42,
      edgesCreated: 5,
      patternsDetected: 0,
      scoresDecayed: 15,
    });
  });

  it("validates input with Zod", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    await expect(knowledgeInferenceWorkflow({})).rejects.toThrow();
    await expect(knowledgeInferenceWorkflow({ teamId: 123 })).rejects.toThrow();
  });

  it("passes correct parameters to aggregateMentions", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "daily",
      sinceTimestamp: 1_000_000,
      resumeOffset: 100,
      phase: "aggregate",
    });

    expect(mockAggregateMentions).toHaveBeenCalledWith({
      teamId: "team1",
      entityBatchOffset: 100,
      batchSize: 500,
      sinceTimestamp: 1_000_000,
    });
  });

  it("passes decay half life to expertise and decay activities", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "weekly",
      decayHalfLifeDays: 45,
      phase: "finalize",
      resumeOffset: 42,
    });

    expect(mockComputeExpertiseScores).toHaveBeenCalledWith(
      expect.objectContaining({ decayHalfLifeDays: 45 })
    );
    expect(mockDecayScores).toHaveBeenCalledWith(
      expect.objectContaining({ halfLifeDays: 45 })
    );
  });

  it("passes thresholds to inferRelationships", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "daily",
      coOccurrenceThreshold: 5,
      confidenceThreshold: 0.8,
      phase: "finalize",
      resumeOffset: 42,
    });

    expect(mockInferRelationships).toHaveBeenCalledWith({
      teamId: "team1",
      coOccurrenceThreshold: 5,
      confidenceThreshold: 0.8,
    });
  });

  it("persists results with workflow ID", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "daily",
      phase: "finalize",
      resumeOffset: 42,
    });

    expect(mockPersistInferenceResults).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team1",
        inferenceRunId: "kg-inference:team1:daily",
      })
    );
  });

  it("continues as new while there are more aggregation pages", async () => {
    const { continueAsNew } = await import("@temporalio/workflow");
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    mockAggregateMentions.mockResolvedValueOnce({
      entityCount: 500,
      hasMore: true,
      nextOffset: 500,
      summary: {},
    });

    await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "daily",
      phase: "aggregate",
      resumeOffset: 0,
    });

    expect(continueAsNew).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team1",
        phase: "aggregate",
        resumeOffset: 500,
      })
    );
  });

  it("skips pattern detection on daily runs when includePatternDetection is false", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "daily",
      includePatternDetection: false,
      phase: "finalize",
      resumeOffset: 42,
    });

    expect(mockDetectPatterns).not.toHaveBeenCalled();
  });

  it("returns output without continueAsNew when no remaining teams", async () => {
    const { knowledgeInferenceWorkflow } = await import(
      "../workflows/scheduled/knowledge-inference"
    );

    const result = await knowledgeInferenceWorkflow({
      teamId: "team1",
      inferenceType: "daily",
      remainingTeamIds: [],
      phase: "finalize",
      resumeOffset: 42,
    });

    expect(result.teamId).toBe("team1");
    expect(result.entitiesProcessed).toBe(42);
  });
});
