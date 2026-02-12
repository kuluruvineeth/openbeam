import { describe, expect, it } from "bun:test";
import { createMockAgent } from "../../__tests__/test-helpers";
import {
  deriveAgentHeaderMetric,
  deriveRuntimePulse,
  summarizeMissionAgentStatuses,
} from "../../lib/mission-detail-header-utils";

describe("summarizeMissionAgentStatuses", () => {
  it("returns status totals and active count", () => {
    const summary = summarizeMissionAgentStatuses({
      a1: createMockAgent({ status: "running" }),
      a2: createMockAgent({ agentId: "a2", status: "blocked" }),
      a3: createMockAgent({ agentId: "a3", status: "completed" }),
      a4: createMockAgent({ agentId: "a4", status: "failed" }),
    });

    expect(summary).toEqual({
      total: 4,
      active: 2,
      running: 1,
      blocked: 1,
      completed: 1,
      failed: 1,
    });
  });
});

describe("deriveRuntimePulse", () => {
  it("prioritizes terminal mission status as done", () => {
    const pulse = deriveRuntimePulse(
      "COMPLETED",
      {
        total: 2,
        active: 1,
        running: 1,
        blocked: 0,
        completed: 1,
        failed: 0,
      },
      0
    );

    expect(pulse).toBe("done");
  });

  it("returns attention when approvals are pending", () => {
    const pulse = deriveRuntimePulse(
      "ACTIVE",
      {
        total: 2,
        active: 1,
        running: 1,
        blocked: 0,
        completed: 0,
        failed: 0,
      },
      1
    );

    expect(pulse).toBe("attention");
  });

  it("returns live when agents are running and no blockers", () => {
    const pulse = deriveRuntimePulse(
      "ACTIVE",
      {
        total: 2,
        active: 1,
        running: 1,
        blocked: 0,
        completed: 0,
        failed: 0,
      },
      0
    );

    expect(pulse).toBe("live");
  });
});

describe("deriveAgentHeaderMetric", () => {
  it("shows Active metric for running missions", () => {
    const metric = deriveAgentHeaderMetric("ACTIVE", {
      total: 4,
      active: 2,
      running: 2,
      blocked: 0,
      completed: 1,
      failed: 1,
    });

    expect(metric).toEqual({
      label: "Active",
      value: "2/4",
    });
  });

  it("shows Done metric for completed missions", () => {
    const metric = deriveAgentHeaderMetric("COMPLETED", {
      total: 4,
      active: 0,
      running: 0,
      blocked: 0,
      completed: 4,
      failed: 0,
    });

    expect(metric).toEqual({
      label: "Done",
      value: "4/4",
    });
  });

  it("shows Settled metric for cancelled missions", () => {
    const metric = deriveAgentHeaderMetric("CANCELLED", {
      total: 4,
      active: 0,
      running: 0,
      blocked: 0,
      completed: 3,
      failed: 1,
    });

    expect(metric).toEqual({
      label: "Settled",
      value: "4/4",
    });
  });

  it("shows zero when there are no mission agents yet", () => {
    const metric = deriveAgentHeaderMetric("ACTIVE", {
      total: 0,
      active: 0,
      running: 0,
      blocked: 0,
      completed: 0,
      failed: 0,
    });

    expect(metric).toEqual({
      label: "Active",
      value: "0",
    });
  });
});
