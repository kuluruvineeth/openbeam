import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiscoveryActivities } from "../activities/mission/discovery";
import { createTeamKnowledgeActivities } from "../activities/mission/team-knowledge";

describe("Mission cross-mission activities", () => {
  describe("discovery activities", () => {
    let sAdd: ReturnType<typeof vi.fn>;
    let expire: ReturnType<typeof vi.fn>;
    let hSet: ReturnType<typeof vi.fn>;
    let exec: ReturnType<typeof vi.fn>;
    let sMembers: ReturnType<typeof vi.fn>;
    let hmGet: ReturnType<typeof vi.fn>;
    let db: {
      mission: { findMany: ReturnType<typeof vi.fn> };
      missionRun: { groupBy: ReturnType<typeof vi.fn> };
    };

    beforeEach(() => {
      sAdd = vi.fn().mockReturnThis();
      expire = vi.fn().mockReturnThis();
      hSet = vi.fn().mockReturnThis();
      exec = vi.fn().mockResolvedValue([]);
      sMembers = vi.fn();
      hmGet = vi.fn();
      db = {
        mission: {
          findMany: vi.fn(),
        },
        missionRun: {
          groupBy: vi.fn(),
        },
      };
    });

    it("registers mission capabilities in redis index", async () => {
      const activities = createDiscoveryActivities({
        db: db as never,
        getClient: async () =>
          ({
            multi: () => ({ sAdd, expire, hSet, exec }),
          }) as never,
      });

      await activities.registerMissionCapabilities({
        missionId: "mission-1",
        teamId: "team-1",
        capabilities: ["analysis", "analysis", "coordination"],
        objective: "Support incident response",
        maxConcurrentRuns: 4,
      });

      expect(sAdd).toHaveBeenCalledTimes(2);
      expect(hSet).toHaveBeenCalledTimes(1);
      expect(exec).toHaveBeenCalledTimes(1);
    });

    it("discovers active missions with matching capabilities", async () => {
      sMembers.mockImplementation((key: string) => {
        if (key.endsWith(":analysis")) {
          return ["mission-2", "mission-3"];
        }
        if (key.endsWith(":research")) {
          return ["mission-2"];
        }
        return [];
      });
      hmGet.mockResolvedValue([
        JSON.stringify({
          objective: "Analyze incidents",
          capabilities: ["analysis", "research"],
        }),
        JSON.stringify({
          objective: "Fallback objective",
          capabilities: ["analysis"],
        }),
      ]);

      db.mission.findMany.mockResolvedValue([
        {
          id: "mission-2",
          objective: "Analyze incidents",
          maxConcurrentRuns: 3,
        },
        {
          id: "mission-3",
          objective: "Secondary",
          maxConcurrentRuns: 1,
        },
      ]);
      db.missionRun.groupBy.mockResolvedValue([
        {
          missionId: "mission-2",
          _count: { missionId: 1 },
        },
      ]);

      const activities = createDiscoveryActivities({
        db: db as never,
        getClient: async () =>
          ({
            sMembers,
            hmGet,
          }) as never,
      });

      const result = await activities.discoverMissions({
        teamId: "team-1",
        requiredCapabilities: ["analysis", "research"],
        excludeMissionId: "mission-1",
      });

      expect(result.missions).toHaveLength(2);
      expect(result.missions[0]).toMatchObject({
        missionId: "mission-2",
        availableSlots: 2,
        matchScore: 1,
      });
    });
  });

  describe("team knowledge activities", () => {
    it("queries entries and updates access counters", async () => {
      const queryRaw = vi.fn().mockResolvedValue([
        {
          id: "knowledge-1",
          content: "Prior finding",
          category: "analysis",
          confidence: 0.9,
          sources: ["https://example.com"],
          createdByMissionId: "mission-2",
        },
      ]);
      const executeRaw = vi.fn().mockResolvedValue(1);
      const activities = createTeamKnowledgeActivities({
        db: {
          $queryRaw: queryRaw,
          $executeRaw: executeRaw,
        } as never,
      });

      const result = await activities.queryTeamKnowledge({
        teamId: "team-1",
        query: "finding",
        minConfidence: 0.5,
        limit: 10,
      });

      expect(result.entries).toHaveLength(1);
      expect(executeRaw).toHaveBeenCalledTimes(1);
    });

    it("deduplicates on existing knowledge hash", async () => {
      const queryRaw = vi
        .fn()
        .mockResolvedValueOnce([{ id: "knowledge-1", confidence: 0.7 }]);
      const executeRaw = vi.fn().mockResolvedValue(1);
      const transaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          $executeRaw: executeRaw,
        })
      );
      const activities = createTeamKnowledgeActivities({
        db: {
          $queryRaw: queryRaw,
          $transaction: transaction,
        } as never,
      });

      const result = await activities.storeTeamKnowledge({
        teamId: "team-1",
        missionId: "mission-1",
        content: "Shared finding",
        category: "analysis",
        sources: ["https://example.com"],
        confidence: 0.9,
      });

      expect(result).toEqual({
        knowledgeId: "knowledge-1",
        deduplicated: true,
      });
      expect(executeRaw).toHaveBeenCalledTimes(2);
    });
  });
});
