import type { SpawnLimits } from "@openplane/types/temporal/mission";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMissionActivities } from "../activities/mission";
import type { MissionActivities } from "../activities/mission/types";

function createMockDb() {
  return {
    missionTask: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    missionAgent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    missionRun: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    missionComment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    missionActivity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    missionMemory: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    mission: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    backgroundAgent: {
      create: vi.fn(),
    },
  };
}

const BASE_SPAWN_LIMITS: SpawnLimits = {
  maxSpawnedAgentsPerMission: 50,
  maxSpawnedAgentsPerAgent: 10,
  maxSpawnDepth: 2,
  maxConcurrentSpawned: 20,
  spawnBudgetPercentage: 40,
};

function baseRequest(overrides: Record<string, unknown> = {}) {
  return {
    missionId: "m1",
    requestId: "spawn-depth-test",
    request: {
      requestingAgentId: "a1",
      taskDescription: "Investigate correlation anomalies in dataset alpha",
      requiredCapabilities: ["research"],
      maxSteps: 10,
      budgetCentsLimit: 50,
      priority: "P2" as const,
      ...overrides,
    },
    currentSpawnedAgentCount: 1,
    spawnLimits: BASE_SPAWN_LIMITS,
    consumedCents: 100,
    budgetCents: 5000,
  };
}

function _mockDepthChain(
  db: ReturnType<typeof createMockDb>,
  depth: number
): void {
  let callIndex = 0;

  db.missionAgent.findFirst.mockImplementation(
    (args: { where: { id?: string } }) => {
      const agentId = args.where.id;
      if (!agentId) {
        return Promise.resolve(null);
      }

      callIndex += 1;

      if (callIndex === 1) {
        return Promise.resolve({ id: agentId, level: "specialist" });
      }

      if (callIndex <= depth + 1) {
        return Promise.resolve({ id: agentId, level: "spawned" });
      }

      return Promise.resolve({ id: agentId, level: "specialist" });
    }
  );

  db.missionTask.findFirst.mockImplementation(() =>
    Promise.resolve({ createdById: `parent-${callIndex}` })
  );
}

describe("Adaptive Depth Limits (4.4)", () => {
  let db: ReturnType<typeof createMockDb>;
  let activities: MissionActivities;

  beforeEach(() => {
    db = createMockDb();
    activities = createMissionActivities({ db: db as never });
  });

  it("approves spawn within normal depth limit", async () => {
    db.missionAgent.findFirst
      .mockResolvedValueOnce({ id: "a1", level: "specialist" })
      .mockResolvedValueOnce(null);
    db.missionActivity.findMany.mockResolvedValue([]);
    db.missionRun.count.mockResolvedValue(0);

    const result = await activities.validateSpawnRequest(baseRequest());

    expect(result.approved).toBe(true);
  });

  it("allows spawn beyond maxDepth when justification is provided", async () => {
    db.missionAgent.findFirst
      .mockResolvedValueOnce({ id: "a1", level: "spawned" })
      .mockResolvedValueOnce(null);
    db.missionTask.findFirst.mockResolvedValue({
      createdById: "parent-root",
    });
    db.missionActivity.findMany.mockResolvedValue([]);
    db.missionRun.count.mockResolvedValue(0);

    const request = baseRequest({
      justification: "Need deeper analysis of sub-pattern in financial data",
    });
    request.spawnLimits = { ...BASE_SPAWN_LIMITS, maxSpawnDepth: 1 };

    const result = await activities.validateSpawnRequest(request);

    expect(result.approved).toBe(true);
  });

  it("rejects spawn beyond maxDepth without justification", async () => {
    let findFirstCall = 0;
    db.missionAgent.findFirst.mockImplementation(
      (args: { where: { id?: string } }) => {
        findFirstCall += 1;
        if (findFirstCall === 1) {
          return Promise.resolve({ id: args.where.id, level: "spawned" });
        }
        if (findFirstCall === 2) {
          return Promise.resolve({ id: "chain-2", level: "spawned" });
        }
        return Promise.resolve({ id: "root", level: "specialist" });
      }
    );
    db.missionTask.findFirst.mockImplementation(() =>
      Promise.resolve({ createdById: `parent-${findFirstCall}` })
    );

    const request = baseRequest();
    request.spawnLimits = { ...BASE_SPAWN_LIMITS, maxSpawnDepth: 1 };

    const result = await activities.validateSpawnRequest(request);

    expect(result.approved).toBe(false);
    expect(result.reason).toContain("provide justification");
  });

  it("rejects at hard depth ceiling regardless of justification", async () => {
    let findFirstCall = 0;
    db.missionAgent.findFirst.mockImplementation(
      (args: { where: { id?: string } }) => {
        findFirstCall += 1;
        if (findFirstCall === 1) {
          return Promise.resolve({ id: args.where.id, level: "spawned" });
        }
        if (findFirstCall <= 4) {
          return Promise.resolve({
            id: `chain-${findFirstCall}`,
            level: "spawned",
          });
        }
        return Promise.resolve({
          id: `root-${findFirstCall}`,
          level: "specialist",
        });
      }
    );
    db.missionTask.findFirst.mockImplementation(() =>
      Promise.resolve({ createdById: `parent-${findFirstCall}` })
    );

    const request = baseRequest({
      justification: "Absolutely critical deep analysis needed",
    });
    request.spawnLimits = { ...BASE_SPAWN_LIMITS, maxSpawnDepth: 1 };

    const result = await activities.validateSpawnRequest(request);

    expect(result.approved).toBe(false);
    expect(result.reason).toContain("Hard spawn depth ceiling");
  });

  it("rejects at requireApprovalAboveDepth threshold", async () => {
    let findFirstCall = 0;
    db.missionAgent.findFirst.mockImplementation(
      (args: { where: { id?: string } }) => {
        findFirstCall += 1;
        if (findFirstCall === 1) {
          return Promise.resolve({ id: args.where.id, level: "spawned" });
        }
        if (findFirstCall === 2) {
          return Promise.resolve({ id: "chain-2", level: "spawned" });
        }
        return Promise.resolve({ id: "root", level: "specialist" });
      }
    );
    db.missionTask.findFirst.mockImplementation(() =>
      Promise.resolve({ createdById: `parent-${findFirstCall}` })
    );
    db.missionActivity.findMany.mockResolvedValue([]);
    db.missionRun.count.mockResolvedValue(0);

    const request = baseRequest({
      justification: "Deep investigation needed",
    });
    request.spawnLimits = {
      ...BASE_SPAWN_LIMITS,
      maxSpawnDepth: 5,
      requireApprovalAboveDepth: 1,
    };

    const result = await activities.validateSpawnRequest(request);

    expect(result.approved).toBe(false);
    expect(result.reason).toContain("exceeds approval threshold");
  });

  it("approves at depth equal to requireApprovalAboveDepth", async () => {
    db.missionAgent.findFirst
      .mockResolvedValueOnce({ id: "a1", level: "specialist" })
      .mockResolvedValueOnce(null);
    db.missionActivity.findMany.mockResolvedValue([]);
    db.missionRun.count.mockResolvedValue(0);

    const request = baseRequest();
    request.spawnLimits = {
      ...BASE_SPAWN_LIMITS,
      maxSpawnDepth: 3,
      requireApprovalAboveDepth: 1,
    };

    const result = await activities.validateSpawnRequest(request);

    expect(result.approved).toBe(true);
  });

  it("hard ceiling is maxSpawnDepth + 2", async () => {
    db.missionAgent.findFirst
      .mockResolvedValueOnce({ id: "a1", level: "specialist" })
      .mockResolvedValueOnce(null);
    db.missionActivity.findMany.mockResolvedValue([]);
    db.missionRun.count.mockResolvedValue(0);

    const request = baseRequest({
      justification: "justified",
    });
    request.spawnLimits = { ...BASE_SPAWN_LIMITS, maxSpawnDepth: 2 };

    const result = await activities.validateSpawnRequest(request);

    expect(result.approved).toBe(true);
    expect(result.reason).not.toContain("Hard spawn depth ceiling");
  });
});
