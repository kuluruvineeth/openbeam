import type { ReviewGatingConfig } from "@openplane/types/temporal/mission";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMissionActivities } from "../activities/mission/index";

function createMockDb() {
  return {
    missionAgent: { findMany: vi.fn() },
    missionMemory: { findUnique: vi.fn(), upsert: vi.fn() },
    missionTask: { findMany: vi.fn(), update: vi.fn() },
    missionComment: { create: vi.fn() },
    mission: { findUnique: vi.fn(), update: vi.fn() },
    missionRun: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    teamKnowledgeEntry: { findMany: vi.fn(), create: vi.fn() },
  };
}

function makeGatingConfig(
  overrides: Partial<ReviewGatingConfig> = {}
): ReviewGatingConfig {
  return {
    policy: "peer",
    requiredReviewers: 1,
    autoAssign: true,
    highStakesPriorities: ["P0"],
    reviewTimeoutMin: 5,
    ...overrides,
  };
}

describe("selectReviewer", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("selects the agent with highest capability overlap", async () => {
    db.missionAgent.findMany.mockResolvedValue([
      {
        id: "agent-1",
        name: "Researcher",
        capabilities: ["research", "writing"],
      },
      {
        id: "agent-2",
        name: "Coder",
        capabilities: ["coding", "testing", "research"],
      },
    ]);

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.selectReviewer({
      missionId: "m1",
      taskId: "t1",
      authorAgentId: "author-1",
      requiredCapabilities: ["research", "writing"],
    });

    expect(result.reviewerAgentId).toBe("agent-1");
    expect(result.reviewerAgentName).toBe("Researcher");
    expect(result.matchScore).toBe(1.0);
  });

  it("excludes the author agent", async () => {
    db.missionAgent.findMany.mockResolvedValue([
      { id: "agent-2", name: "Backup", capabilities: ["research"] },
    ]);

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.selectReviewer({
      missionId: "m1",
      taskId: "t1",
      authorAgentId: "author-1",
      requiredCapabilities: ["research"],
    });

    expect(result.reviewerAgentId).toBe("agent-2");
    expect(db.missionAgent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "author-1" },
        }),
      })
    );
  });

  it("throws when no reviewer agents are available", async () => {
    db.missionAgent.findMany.mockResolvedValue([]);

    const activities = createMissionActivities({ db: db as never });

    await expect(
      activities.selectReviewer({
        missionId: "m1",
        taskId: "t1",
        authorAgentId: "author-1",
        requiredCapabilities: ["research"],
      })
    ).rejects.toThrow("No available reviewer agents");
  });

  it("assigns 0.5 matchScore when no capabilities are required", async () => {
    db.missionAgent.findMany.mockResolvedValue([
      { id: "agent-1", name: "Generic", capabilities: [] },
    ]);

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.selectReviewer({
      missionId: "m1",
      taskId: "t1",
      authorAgentId: "author-1",
      requiredCapabilities: [],
    });

    expect(result.matchScore).toBe(0.5);
  });

  it("handles agents with null capabilities", async () => {
    db.missionAgent.findMany.mockResolvedValue([
      { id: "agent-1", name: "NullCaps", capabilities: null },
    ]);

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.selectReviewer({
      missionId: "m1",
      taskId: "t1",
      authorAgentId: "author-1",
      requiredCapabilities: ["research"],
    });

    expect(result.reviewerAgentId).toBe("agent-1");
    expect(result.matchScore).toBe(0);
  });

  it("breaks ties by returning the first sorted agent", async () => {
    db.missionAgent.findMany.mockResolvedValue([
      { id: "agent-a", name: "Alpha", capabilities: ["research"] },
      { id: "agent-b", name: "Beta", capabilities: ["research"] },
    ]);

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.selectReviewer({
      missionId: "m1",
      taskId: "t1",
      authorAgentId: "author-1",
      requiredCapabilities: ["research"],
    });

    expect(result.matchScore).toBe(1.0);
    expect(["agent-a", "agent-b"]).toContain(result.reviewerAgentId);
  });
});

describe("checkReviewGating", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns ungated for 'none' policy", async () => {
    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P2",
      reviewGating: makeGatingConfig({ policy: "none" }),
    });

    expect(result.gated).toBe(false);
    expect(result.requiredReviewers).toBe(0);
    expect(result.completedReviews).toBe(0);
  });

  it("returns ungated for peer_high_stakes when priority is below threshold", async () => {
    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P2",
      reviewGating: makeGatingConfig({
        policy: "peer_high_stakes",
        highStakesPriorities: ["P0", "P1"],
      }),
    });

    expect(result.gated).toBe(false);
    expect(result.reason).toContain("P2");
  });

  it("returns gated for peer_high_stakes when priority matches", async () => {
    db.missionMemory.findUnique.mockResolvedValue(null);

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P0",
      reviewGating: makeGatingConfig({
        policy: "peer_high_stakes",
        highStakesPriorities: ["P0"],
      }),
    });

    expect(result.gated).toBe(true);
    expect(result.requiredReviewers).toBe(1);
    expect(result.completedReviews).toBe(0);
  });

  it("returns ungated when sufficient approvals exist", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: [
        { verdict: "approve", reviewerAgentId: "r1" },
        { verdict: "approve", reviewerAgentId: "r2" },
      ],
    });

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({ policy: "peer", requiredReviewers: 1 }),
    });

    expect(result.gated).toBe(false);
    expect(result.completedReviews).toBe(2);
    expect(result.reason).toContain("Review requirement met");
  });

  it("returns gated when approvals are insufficient", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: [{ verdict: "revise", reviewerAgentId: "r1" }],
    });

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({ policy: "peer", requiredReviewers: 1 }),
    });

    expect(result.gated).toBe(true);
    expect(result.completedReviews).toBe(0);
    expect(result.reason).toContain("1 more approval");
  });

  it("requires multiple approvals for consensus policy", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: [{ verdict: "approve", reviewerAgentId: "r1" }],
    });

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({
        policy: "consensus",
        requiredReviewers: 3,
      }),
    });

    expect(result.gated).toBe(true);
    expect(result.requiredReviewers).toBe(3);
    expect(result.completedReviews).toBe(1);
    expect(result.reason).toContain("2 more approval");
  });

  it("returns ungated for consensus when all required approvals exist", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: [
        { verdict: "approve", reviewerAgentId: "r1" },
        { verdict: "approve", reviewerAgentId: "r2" },
        { verdict: "approve", reviewerAgentId: "r3" },
      ],
    });

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({
        policy: "consensus",
        requiredReviewers: 3,
      }),
    });

    expect(result.gated).toBe(false);
    expect(result.completedReviews).toBe(3);
    expect(result.requiredReviewers).toBe(3);
  });

  it("handles corrupted memory value gracefully", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: "not-an-array",
    });

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({ policy: "peer" }),
    });

    expect(result.gated).toBe(true);
    expect(result.completedReviews).toBe(0);
  });

  it("reads from correct memory key", async () => {
    db.missionMemory.findUnique.mockResolvedValue(null);

    const activities = createMissionActivities({ db: db as never });

    await activities.checkReviewGating({
      missionId: "m1",
      taskId: "task-42",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({ policy: "peer" }),
    });

    expect(db.missionMemory.findUnique).toHaveBeenCalledWith({
      where: {
        missionId_agentId_key_scope: {
          missionId: "m1",
          agentId: "system",
          key: "peer_reviews:task-42",
          scope: "mission",
        },
      },
    });
  });

  it("only counts approve verdicts toward threshold", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: [
        { verdict: "approve", reviewerAgentId: "r1" },
        { verdict: "revise", reviewerAgentId: "r2" },
        { verdict: "reject", reviewerAgentId: "r3" },
      ],
    });

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({
        policy: "consensus",
        requiredReviewers: 2,
      }),
    });

    expect(result.gated).toBe(true);
    expect(result.completedReviews).toBe(1);
  });

  it("returns ungated for auto policy with any approval", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: [{ verdict: "approve", reviewerAgentId: "r1" }],
    });

    const activities = createMissionActivities({ db: db as never });

    const result = await activities.checkReviewGating({
      missionId: "m1",
      taskId: "t1",
      taskPriority: "P1",
      reviewGating: makeGatingConfig({ policy: "auto" }),
    });

    expect(result.gated).toBe(false);
    expect(result.completedReviews).toBe(1);
  });
});
