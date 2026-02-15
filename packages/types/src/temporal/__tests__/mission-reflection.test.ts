import { describe, expect, it } from "bun:test";
import {
  CriticReviewSchema,
  MissionHealthSnapshotSchema,
  ReplanRequestSchema,
  StepEvaluationSchema,
} from "../mission-reflection";

describe("StepEvaluationSchema", () => {
  it("parses a valid evaluation", () => {
    const parsed = StepEvaluationSchema.parse({
      progressScore: 0.45,
      confidenceScore: 0.6,
      stuckIndicators: {
        repeatingActions: false,
        noNewArtifacts: true,
        errorLoop: false,
        progressPlateau: true,
      },
      reasoning: "Progress stalled after repeated tool calls",
      suggestedAction: "replan",
    });

    expect(parsed.progressScore).toBe(0.45);
    expect(parsed.suggestedAction).toBe("replan");
  });

  it("rejects score values outside [0, 1]", () => {
    expect(() =>
      StepEvaluationSchema.parse({
        progressScore: 2,
        confidenceScore: 0.5,
        stuckIndicators: {
          repeatingActions: false,
          noNewArtifacts: false,
          errorLoop: false,
          progressPlateau: false,
        },
        reasoning: "invalid",
        suggestedAction: "continue",
      })
    ).toThrow();
  });
});

describe("ReplanRequestSchema", () => {
  it("parses request with reflection buffer", () => {
    const parsed = ReplanRequestSchema.parse({
      missionId: "mission-1",
      taskId: "task-1",
      agentId: "agent-1",
      currentApproach: "Try direct synthesis of all docs",
      reflectionBuffer: [
        {
          step: 2,
          evaluation: {
            progressScore: 0.2,
            confidenceScore: 0.3,
            stuckIndicators: {
              repeatingActions: true,
              noNewArtifacts: true,
              errorLoop: false,
              progressPlateau: true,
            },
            reasoning: "Approach not producing new signal",
            suggestedAction: "replan",
          },
          approach: "Direct synthesis",
          outcome: "Low-confidence summary",
          timestamp: Date.now(),
        },
      ],
      failurePatterns: ["Repeated top-level summarization with no retrieval"],
      taskContext: {
        title: "Build incident summary",
        description: "Summarize all incident threads",
        priorAttempts: 1,
      },
    });

    expect(parsed.reflectionBuffer).toHaveLength(1);
    expect(parsed.taskContext.priorAttempts).toBe(1);
  });
});

describe("CriticReviewSchema", () => {
  it("parses critic response with issues", () => {
    const parsed = CriticReviewSchema.parse({
      passed: false,
      qualityScore: 0.4,
      issues: [
        {
          severity: "major",
          description: "Missing validation for primary claim",
        },
      ],
      recommendation: "revise",
    });

    expect(parsed.passed).toBe(false);
    expect(parsed.issues[0]?.severity).toBe("major");
  });
});

describe("MissionHealthSnapshotSchema", () => {
  it("parses mission health snapshot", () => {
    const parsed = MissionHealthSnapshotSchema.parse({
      missionId: "mission-1",
      timestamp: Date.now(),
      agents: [
        {
          agentId: "agent-1",
          taskId: "task-1",
          stepsCompleted: 4,
          lastProgressScore: 0.25,
          stuckSince: Date.now() - 60_000,
          replanCount: 1,
          status: "stuck",
        },
      ],
      stalledTasks: ["task-1"],
      failedDependencies: [
        {
          failedTaskId: "task-a",
          blockedTaskIds: ["task-b"],
        },
      ],
    });

    expect(parsed.agents[0]?.status).toBe("stuck");
    expect(parsed.failedDependencies[0]?.blockedTaskIds[0]).toBe("task-b");
  });
});
