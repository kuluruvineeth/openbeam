import { describe, expect, it } from "bun:test";
import { createUnimplementedServices } from "../../../services";
import type { ToolContext } from "../../../types";
import { missionEscalate } from "../escalate";
import { missionEvaluateProgress } from "../evaluate-progress";
import { missionRequestReplan } from "../request-replan";

const context: ToolContext = {
  teamId: "team-1",
  userId: "user-1",
  services: createUnimplementedServices(),
  metadata: {
    missionId: "mission-1",
    agentId: "agent-1",
    runId: "run-1",
  },
};

describe("missionEvaluateProgress", () => {
  it("maps low confidence to replan recommendation", async () => {
    const result = await missionEvaluateProgress.execute(
      {
        assessment: "No forward progress in last two steps",
        confidenceLevel: "low",
        blockers: ["Insufficient source grounding"],
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.progressScore).toBe(0.2);
    expect(result.data?.recommendation).toBe("replan");
  });
});

describe("missionRequestReplan", () => {
  it("returns acknowledged replan request payload", async () => {
    const result = await missionRequestReplan.execute(
      {
        currentApproachSummary: "Single-pass synthesis",
        failureAnalysis: "Conflicting evidence not reconciled",
        suggestedAlternative: "Split by source reliability first",
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.acknowledged).toBe(true);
    expect(result.data?.suggestedAlternative).toBe(
      "Split by source reliability first"
    );
  });
});

describe("missionEscalate", () => {
  it("returns escalation acknowledgment", async () => {
    const result = await missionEscalate.execute(
      {
        reason: "Task requires privileged system access",
        attemptedApproaches: ["API query", "cached snapshot analysis"],
        suggestedNextSteps: ["Assign admin-capable operator"],
        urgency: "high",
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.escalated).toBe(true);
    expect(result.data?.urgency).toBe("high");
  });
});
