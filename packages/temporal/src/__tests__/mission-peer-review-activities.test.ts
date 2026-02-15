import type { PeerReview } from "@openplane/types/temporal/mission-reflection";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createReflectionActivities,
  tallyReviewConsensus,
} from "../activities/mission/reflection";

function createMockDb() {
  return {
    missionRun: { findMany: vi.fn() },
    missionMemory: { findUnique: vi.fn(), upsert: vi.fn() },
    missionTask: { findMany: vi.fn(), update: vi.fn() },
    missionComment: { create: vi.fn() },
  };
}

function makeReview(overrides: Partial<PeerReview> = {}): PeerReview {
  return {
    reviewId: "r1",
    taskId: "task-1",
    reviewerAgentId: "reviewer-a",
    reviewerAgentName: "Reviewer A",
    authorAgentId: "author-1",
    verdict: "approve",
    qualityScore: 0.85,
    issues: [],
    strengths: ["Thorough analysis"],
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("tallyReviewConsensus", () => {
  it("returns default approve for empty reviews", () => {
    const result = tallyReviewConsensus([], "task-1");

    expect(result.finalVerdict).toBe("approve");
    expect(result.averageQualityScore).toBe(0);
    expect(result.unanimousApproval).toBe(true);
    expect(result.hasVeto).toBe(false);
    expect(result.reviews).toHaveLength(0);
    expect(result.reasoning).toBe("No reviews submitted");
  });

  it("returns unanimous approval for all approve verdicts", () => {
    const reviews = [
      makeReview({ reviewId: "r1", reviewerAgentId: "a1", qualityScore: 0.9 }),
      makeReview({ reviewId: "r2", reviewerAgentId: "a2", qualityScore: 0.8 }),
    ];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.finalVerdict).toBe("approve");
    expect(result.unanimousApproval).toBe(true);
    expect(result.hasVeto).toBe(false);
    expect(result.averageQualityScore).toBeCloseTo(0.85, 5);
    expect(result.reasoning).toBe("Unanimously approved");
  });

  it("triggers veto on any reject verdict", () => {
    const reviews = [
      makeReview({
        reviewId: "r1",
        reviewerAgentId: "a1",
        verdict: "approve",
        qualityScore: 0.9,
      }),
      makeReview({
        reviewId: "r2",
        reviewerAgentId: "a2",
        reviewerAgentName: "Reviewer B",
        verdict: "reject",
        qualityScore: 0.3,
      }),
    ];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.finalVerdict).toBe("reject");
    expect(result.hasVeto).toBe(true);
    expect(result.unanimousApproval).toBe(false);
    expect(result.averageQualityScore).toBe(0.6);
    expect(result.reasoning).toContain("Reviewer B");
  });

  it("returns approve when approve count exceeds revise count", () => {
    const reviews = [
      makeReview({ reviewId: "r1", reviewerAgentId: "a1", verdict: "approve" }),
      makeReview({ reviewId: "r2", reviewerAgentId: "a2", verdict: "approve" }),
      makeReview({ reviewId: "r3", reviewerAgentId: "a3", verdict: "revise" }),
    ];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.finalVerdict).toBe("approve");
    expect(result.unanimousApproval).toBe(false);
    expect(result.reasoning).toContain("2 approve, 1 revise");
  });

  it("returns revise when revise count exceeds approve count", () => {
    const reviews = [
      makeReview({ reviewId: "r1", reviewerAgentId: "a1", verdict: "approve" }),
      makeReview({ reviewId: "r2", reviewerAgentId: "a2", verdict: "revise" }),
      makeReview({ reviewId: "r3", reviewerAgentId: "a3", verdict: "revise" }),
    ];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.finalVerdict).toBe("revise");
    expect(result.unanimousApproval).toBe(false);
    expect(result.reasoning).toContain("1 approve, 2 revise");
  });

  it("returns approve when approve and revise counts are equal", () => {
    const reviews = [
      makeReview({ reviewId: "r1", reviewerAgentId: "a1", verdict: "approve" }),
      makeReview({ reviewId: "r2", reviewerAgentId: "a2", verdict: "revise" }),
    ];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.finalVerdict).toBe("approve");
  });

  it("calculates average quality score correctly", () => {
    const reviews = [
      makeReview({
        reviewId: "r1",
        reviewerAgentId: "a1",
        qualityScore: 0.6,
      }),
      makeReview({
        reviewId: "r2",
        reviewerAgentId: "a2",
        qualityScore: 0.8,
      }),
      makeReview({
        reviewId: "r3",
        reviewerAgentId: "a3",
        qualityScore: 1.0,
      }),
    ];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.averageQualityScore).toBeCloseTo(0.8, 5);
  });

  it("includes all reviewer names in reject reasoning", () => {
    const reviews = [
      makeReview({
        reviewId: "r1",
        reviewerAgentId: "a1",
        reviewerAgentName: "Alice",
        verdict: "reject",
      }),
      makeReview({
        reviewId: "r2",
        reviewerAgentId: "a2",
        reviewerAgentName: "Bob",
        verdict: "reject",
      }),
    ];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.reasoning).toContain("Alice");
    expect(result.reasoning).toContain("Bob");
  });

  it("preserves taskId in result", () => {
    const result = tallyReviewConsensus([], "my-task-id");
    expect(result.taskId).toBe("my-task-id");
  });

  it("handles single reviewer", () => {
    const reviews = [makeReview({ verdict: "revise", qualityScore: 0.5 })];

    const result = tallyReviewConsensus(reviews, "task-1");

    expect(result.finalVerdict).toBe("revise");
    expect(result.unanimousApproval).toBe(false);
    expect(result.averageQualityScore).toBe(0.5);
  });
});

describe("submitPeerReview activity", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("stores a new review in mission memory", async () => {
    db.missionMemory.findUnique.mockResolvedValue(null);
    db.missionMemory.upsert.mockResolvedValue({});

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const review = makeReview();
    await activities.submitPeerReview({
      missionId: "mission-1",
      review,
    });

    expect(db.missionMemory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          missionId: "mission-1",
          agentId: "system",
          key: "peer_reviews:task-1",
          scope: "mission",
          value: [review],
        }),
        update: expect.objectContaining({
          value: [review],
        }),
      })
    );
  });

  it("appends to existing reviews", async () => {
    const existingReview = makeReview({
      reviewId: "existing",
      reviewerAgentId: "other-agent",
    });

    db.missionMemory.findUnique.mockResolvedValue({
      value: [existingReview],
    });
    db.missionMemory.upsert.mockResolvedValue({});

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const newReview = makeReview({
      reviewId: "new",
      reviewerAgentId: "reviewer-a",
    });

    await activities.submitPeerReview({
      missionId: "mission-1",
      review: newReview,
    });

    const upsertCall = db.missionMemory.upsert.mock.calls[0]?.[0];
    const storedReviews = upsertCall?.update?.value as PeerReview[];
    expect(storedReviews).toHaveLength(2);
    expect(storedReviews[0]?.reviewId).toBe("existing");
    expect(storedReviews[1]?.reviewId).toBe("new");
  });

  it("deduplicates by reviewer agent ID", async () => {
    const existingReview = makeReview({
      reviewId: "original",
      reviewerAgentId: "reviewer-a",
      qualityScore: 0.5,
    });

    db.missionMemory.findUnique.mockResolvedValue({
      value: [existingReview],
    });
    db.missionMemory.upsert.mockResolvedValue({});

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const duplicateReview = makeReview({
      reviewId: "duplicate",
      reviewerAgentId: "reviewer-a",
      qualityScore: 0.9,
    });

    await activities.submitPeerReview({
      missionId: "mission-1",
      review: duplicateReview,
    });

    const upsertCall = db.missionMemory.upsert.mock.calls[0]?.[0];
    const storedReviews = upsertCall?.update?.value as PeerReview[];
    expect(storedReviews).toHaveLength(1);
    expect(storedReviews[0]?.reviewId).toBe("original");
  });
});

describe("getPeerReviews activity", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns empty reviews with null consensus when no reviews exist", async () => {
    db.missionMemory.findUnique.mockResolvedValue(null);

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const result = await activities.getPeerReviews({
      missionId: "mission-1",
      taskId: "task-1",
    });

    expect(result.reviews).toHaveLength(0);
    expect(result.consensus).toBeNull();
  });

  it("returns reviews with computed consensus", async () => {
    const reviews = [
      makeReview({
        reviewId: "r1",
        reviewerAgentId: "a1",
        verdict: "approve",
        qualityScore: 0.9,
      }),
      makeReview({
        reviewId: "r2",
        reviewerAgentId: "a2",
        verdict: "approve",
        qualityScore: 0.8,
      }),
    ];

    db.missionMemory.findUnique.mockResolvedValue({ value: reviews });

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const result = await activities.getPeerReviews({
      missionId: "mission-1",
      taskId: "task-1",
    });

    expect(result.reviews).toHaveLength(2);
    expect(result.consensus).not.toBeNull();
    expect(result.consensus?.finalVerdict).toBe("approve");
    expect(result.consensus?.unanimousApproval).toBe(true);
    expect(result.consensus?.averageQualityScore).toBeCloseTo(0.85, 5);
  });

  it("handles corrupted memory value gracefully", async () => {
    db.missionMemory.findUnique.mockResolvedValue({
      value: "not-an-array",
    });

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const result = await activities.getPeerReviews({
      missionId: "mission-1",
      taskId: "task-1",
    });

    expect(result.reviews).toHaveLength(0);
    expect(result.consensus).toBeNull();
  });
});
