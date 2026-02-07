import type { LoopState } from "@openplane/types/temporal";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SAFETY_CEILINGS } from "../config/constants";

const HARD_ITERATION_CEILING_RE = /hard iteration ceiling/;
const HARD_DURATION_CEILING_RE = /hard duration ceiling/;
const BRANCH_CEILING_RE = /too_big|branch ceiling/i;

import {
  createLoopNodePlan,
  createMockDb,
  createMockDbActivities,
  createSplitNode,
} from "./fixtures";

vi.mock("@temporalio/activity", () => ({
  heartbeat: vi.fn().mockReturnValue(undefined),
  Context: {
    current: () => ({
      heartbeat: vi.fn().mockReturnValue(undefined),
    }),
  },
}));

const mockDbActivities = createMockDbActivities();

vi.mock("@openplane/db", () => mockDbActivities);

let createExecuteLoopNodeActivity: typeof import("../activities/canvas/loop-node").createExecuteLoopNodeActivity;
let createExecuteParallelSplitNodeActivity: typeof import("../activities/canvas/parallel-split-node").createExecuteParallelSplitNodeActivity;

beforeAll(async () => {
  const loopMod = await import("../activities/canvas/loop-node");
  createExecuteLoopNodeActivity = loopMod.createExecuteLoopNodeActivity;

  const splitMod = await import("../activities/canvas/parallel-split-node");
  createExecuteParallelSplitNodeActivity =
    splitMod.createExecuteParallelSplitNodeActivity;
});

function createValidLoopState(overrides: Partial<LoopState> = {}): LoopState {
  return {
    nodeId: "loop",
    type: "times",
    startedAt: Date.now(),
    iteration: 0,
    index: 0,
    ...overrides,
  } as LoopState;
}

describe("safety ceilings", () => {
  describe("loop iteration ceiling", () => {
    it("enforces hard iteration ceiling even when config allows more", async () => {
      const mockDb = createMockDb("team-1");
      const activity = createExecuteLoopNodeActivity({ db: mockDb as never });
      const node = createLoopNodePlan({
        type: "times",
        times: SAFETY_CEILINGS.HARD_MAX_LOOP_ITERATIONS + 100,
        executionMode: "sequential",
        errorHandling: "stop",
        maxIterations: SAFETY_CEILINGS.HARD_MAX_LOOP_ITERATIONS + 100,
        outputMode: "all",
      });

      const loopState = createValidLoopState({
        iteration: SAFETY_CEILINGS.HARD_MAX_LOOP_ITERATIONS,
        index: SAFETY_CEILINGS.HARD_MAX_LOOP_ITERATIONS,
      });

      await expect(
        activity({
          executionId: "exec-ceiling-1",
          teamId: "team-1",
          node,
          input: {},
          loopState,
        })
      ).rejects.toThrow(HARD_ITERATION_CEILING_RE);
    });

    it("allows iterations below the ceiling", async () => {
      const mockDb = createMockDb("team-1");
      const activity = createExecuteLoopNodeActivity({ db: mockDb as never });
      const node = createLoopNodePlan({
        type: "times",
        times: 3,
        executionMode: "sequential",
        errorHandling: "stop",
        maxIterations: 10,
        outputMode: "all",
      });

      const result = await activity({
        executionId: "exec-ceiling-2",
        teamId: "team-1",
        node,
        input: {},
      });

      expect(result.branchId).toBe("body");
    });
  });

  describe("loop duration ceiling", () => {
    it("enforces hard duration ceiling even when config allows more", async () => {
      const mockDb = createMockDb("team-1");
      const activity = createExecuteLoopNodeActivity({ db: mockDb as never });
      const node = createLoopNodePlan({
        type: "times",
        times: 10,
        executionMode: "sequential",
        errorHandling: "stop",
        maxIterations: 10,
        outputMode: "all",
        timeoutMs: SAFETY_CEILINGS.HARD_MAX_LOOP_DURATION_MS + 1_000_000,
      });

      const startedAt =
        Date.now() - SAFETY_CEILINGS.HARD_MAX_LOOP_DURATION_MS - 1000;
      const loopState = createValidLoopState({
        iteration: 1,
        index: 1,
        startedAt,
      });

      await expect(
        activity({
          executionId: "exec-duration-1",
          teamId: "team-1",
          node,
          input: {},
          loopState,
        })
      ).rejects.toThrow(HARD_DURATION_CEILING_RE);
    });
  });

  describe("parallel branch ceiling", () => {
    it("rejects split with more branches than Zod schema allows (defense-in-depth)", async () => {
      const mockDb = createMockDb("team-1");
      const activity = createExecuteParallelSplitNodeActivity({
        db: mockDb as never,
      });

      const branches = Array.from({ length: 11 }, (_, i) => ({
        id: `branch-${i}`,
        label: `Branch ${i}`,
      }));

      const node = createSplitNode({
        branches,
        dataDistribution: "broadcast",
        executionMode: "parallel",
        maxConcurrency: 10,
        waitForAll: true,
        errorHandling: "failFast",
      });

      await expect(
        activity({
          executionId: "exec-branch-1",
          teamId: "team-1",
          node,
          input: { test: "data" },
        })
      ).rejects.toThrow(BRANCH_CEILING_RE);
    });

    it("allows splits within schema limits", async () => {
      const mockDb = createMockDb("team-1");
      const activity = createExecuteParallelSplitNodeActivity({
        db: mockDb as never,
      });

      const branches = Array.from({ length: 3 }, (_, i) => ({
        id: `branch-${i}`,
        label: `Branch ${i}`,
      }));

      const node = createSplitNode({
        branches,
        dataDistribution: "broadcast",
        executionMode: "parallel",
        maxConcurrency: 3,
        waitForAll: true,
        errorHandling: "failFast",
      });

      const result = await activity({
        executionId: "exec-branch-2",
        teamId: "team-1",
        node,
        input: { test: "data" },
      });

      expect(result.output.branches).toHaveLength(3);
    });
  });
});

describe("SAFETY_CEILINGS constants", () => {
  it("has expected ceiling values", () => {
    expect(SAFETY_CEILINGS.HARD_MAX_LOOP_ITERATIONS).toBe(10_000);
    expect(SAFETY_CEILINGS.HARD_MAX_LOOP_DURATION_MS).toBe(3_600_000);
    expect(SAFETY_CEILINGS.MAX_PARALLEL_BRANCHES).toBe(100);
    expect(SAFETY_CEILINGS.MAX_SIGNAL_QUEUE_SIZE).toBe(1000);
    expect(SAFETY_CEILINGS.MAX_EXECUTION_DURATION_MS).toBe(14_400_000);
    expect(SAFETY_CEILINGS.MAX_TOTAL_NODE_EXECUTIONS).toBe(50_000);
    expect(SAFETY_CEILINGS.MAX_LOOP_NESTING_DEPTH).toBe(10);
  });

  it("runtime ceiling is higher than schema ceiling for defense-in-depth", () => {
    expect(SAFETY_CEILINGS.MAX_PARALLEL_BRANCHES).toBeGreaterThanOrEqual(10);
  });

  it("execution duration ceiling is 4 hours", () => {
    expect(SAFETY_CEILINGS.MAX_EXECUTION_DURATION_MS).toBe(4 * 60 * 60 * 1000);
  });

  it("loop nesting depth is reasonable", () => {
    expect(SAFETY_CEILINGS.MAX_LOOP_NESTING_DEPTH).toBeGreaterThanOrEqual(5);
    expect(SAFETY_CEILINGS.MAX_LOOP_NESTING_DEPTH).toBeLessThanOrEqual(50);
  });
});
