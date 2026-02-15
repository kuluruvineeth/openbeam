import { describe, expect, it, mock } from "bun:test";
import { createUnimplementedServices } from "../../../services";
import type { ToolContext } from "../../../types";
import {
  missionDelegateToMission,
  missionDiscoverMissions,
  setMissionDelegationServices,
} from "../delegation";
import {
  missionQueryTeamKnowledge,
  missionStoreTeamKnowledge,
  setTeamKnowledgeServices,
} from "../team-knowledge";

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

describe("missionQueryTeamKnowledge", () => {
  it("returns mapped team knowledge entries", async () => {
    const queryTeamKnowledge = mock(async () => ({
      entries: [
        {
          id: "k1",
          content: "Prior finding",
          category: "research",
          confidence: 0.9,
          sources: ["https://example.com"],
          createdByMissionId: "mission-2",
        },
      ],
    }));

    setTeamKnowledgeServices({
      queryTeamKnowledge,
      storeTeamKnowledge: async () => ({
        knowledgeId: "k1",
        deduplicated: false,
      }),
    });

    const result = await missionQueryTeamKnowledge.execute(
      {
        query: "finding",
        minConfidence: 0.5,
        limit: 5,
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.totalFound).toBe(1);
    expect(result.data?.entries[0]?.fromMissionId).toBe("mission-2");
    expect(queryTeamKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        excludeMissionId: "mission-1",
      })
    );
  });
});

describe("missionStoreTeamKnowledge", () => {
  it("stores team knowledge with mission context", async () => {
    const storeTeamKnowledge = mock(async () => ({
      knowledgeId: "knowledge-123",
      deduplicated: true,
    }));

    setTeamKnowledgeServices({
      queryTeamKnowledge: async () => ({ entries: [] }),
      storeTeamKnowledge,
    });

    const result = await missionStoreTeamKnowledge.execute(
      {
        content: "Useful result",
        category: "analysis",
        sources: ["https://source"],
        confidence: 0.8,
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.knowledgeId).toBe("knowledge-123");
    expect(storeTeamKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        missionId: "mission-1",
      })
    );
  });
});

describe("mission delegation tools", () => {
  it("discovers matching missions", async () => {
    const discoverMissions = mock(async () => ({
      missions: [
        {
          missionId: "mission-2",
          objective: "Analyze incidents",
          capabilities: ["analysis"],
          availableSlots: 2,
          matchScore: 1,
        },
      ],
    }));

    setMissionDelegationServices({
      discoverMissions,
      delegateTask: async () => ({
        requestId: "request-1",
        accepted: true,
      }),
    });

    const result = await missionDiscoverMissions.execute(
      { requiredCapabilities: ["analysis"] },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.missions).toHaveLength(1);
    expect(discoverMissions).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        excludeMissionId: "mission-1",
      })
    );
  });

  it("delegates task to selected mission", async () => {
    const delegateTask = mock(async () => ({
      requestId: "request-abc",
      accepted: true,
    }));

    setMissionDelegationServices({
      discoverMissions: async () => ({ missions: [] }),
      delegateTask,
    });

    const result = await missionDelegateToMission.execute(
      {
        targetMissionId: "mission-2",
        taskTitle: "Investigate",
        taskDescription: "Investigate issue and return findings",
        requiredCapabilities: ["analysis"],
        priority: "P1",
        timeoutMs: 120_000,
        context: { scope: "incident" },
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data?.requestId).toBe("request-abc");
    expect(delegateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceMissionId: "mission-1",
        targetMissionId: "mission-2",
        teamId: "team-1",
      })
    );
  });
});
