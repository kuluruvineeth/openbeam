import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSignal = vi.fn();
const mockGetHandle = vi.fn();

vi.mock("../client", () => ({
  getTemporalClient: vi.fn().mockResolvedValue({
    workflow: {
      getHandle: (...args: unknown[]) => mockGetHandle(...args),
    },
  }),
}));

import { createMissionActivities } from "../activities/mission";
import { spawnAgentSignal } from "../workflows/types";

describe("mission spawn activities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHandle.mockReturnValue({
      signal: (...args: unknown[]) => mockSignal(...args),
    });
    mockSignal.mockResolvedValue(undefined);
  });

  it("signals orchestrator for spawn request", async () => {
    const activities = createMissionActivities({
      db: {} as never,
    });

    const result = await activities.requestAgentSpawn({
      missionId: "mission-1",
      requestId: "spawn-1",
      requestingAgentId: "agent-1",
      taskDescription: "Collect evidence and summarize contradictions",
      requiredCapabilities: ["research"],
      priority: "P2",
      maxSteps: 8,
      budgetCentsLimit: 40,
    });

    expect(result).toEqual({
      requestId: "spawn-1",
      delivered: true,
    });
    expect(mockGetHandle).toHaveBeenCalledWith("mission:mission-1");
    expect(mockSignal).toHaveBeenCalledWith(
      spawnAgentSignal,
      expect.objectContaining({
        requestId: "spawn-1",
        request: expect.objectContaining({
          requestingAgentId: "agent-1",
          requiredCapabilities: ["research"],
        }),
      })
    );
  });

  it("returns delivered false when signal fails", async () => {
    mockSignal.mockRejectedValue(new Error("signal failed"));

    const activities = createMissionActivities({
      db: {} as never,
    });

    const result = await activities.requestAgentSpawn({
      missionId: "mission-1",
      requestId: "spawn-2",
      requestingAgentId: "agent-1",
      taskDescription: "Analyze dispatch bottleneck and propose mitigation",
      requiredCapabilities: ["analysis"],
      priority: "P2",
      maxSteps: 8,
      budgetCentsLimit: 40,
    });

    expect(result).toEqual({
      requestId: "spawn-2",
      delivered: false,
    });
  });
});
