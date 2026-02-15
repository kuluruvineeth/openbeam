import type { Database } from "@openplane/db";
import { getRedisClient } from "@openplane/redis";

const CAPABILITY_INDEX_PREFIX = "mission:capabilities";
const CAPABILITY_TTL_SECONDS = 300;

function capabilityKey(teamId: string, capability: string): string {
  return `${CAPABILITY_INDEX_PREFIX}:${teamId}:${capability}`;
}

function missionSetKey(teamId: string): string {
  return `${CAPABILITY_INDEX_PREFIX}:${teamId}:__missions__`;
}

function normalizeCapability(value: string): string {
  return value.trim().toLowerCase();
}

type DiscoveryRedisClient = Awaited<ReturnType<typeof getRedisClient>>;

function parseMissionMetadata(
  raw: string
): { objective?: string; capabilities?: string[] } | null {
  try {
    return JSON.parse(raw) as { objective?: string; capabilities?: string[] };
  } catch {
    return null;
  }
}

export interface DiscoveryActivityDependencies {
  db: Database;
  getClient?: () => Promise<DiscoveryRedisClient>;
}

export function createDiscoveryActivities(deps: DiscoveryActivityDependencies) {
  const { db } = deps;
  const getClient = deps.getClient ?? getRedisClient;

  return {
    async registerMissionCapabilities(input: {
      missionId: string;
      teamId: string;
      capabilities: string[];
      objective: string;
      maxConcurrentRuns: number;
    }): Promise<void> {
      const redis = await getClient();
      const normalizedCapabilities = [
        ...new Set(input.capabilities.map(normalizeCapability).filter(Boolean)),
      ];
      const payload = JSON.stringify({
        missionId: input.missionId,
        objective: input.objective,
        capabilities: normalizedCapabilities,
        maxConcurrentRuns: input.maxConcurrentRuns,
      });

      const pipeline = redis.multi();
      for (const capability of normalizedCapabilities) {
        pipeline.sAdd(capabilityKey(input.teamId, capability), input.missionId);
        pipeline.expire(
          capabilityKey(input.teamId, capability),
          CAPABILITY_TTL_SECONDS
        );
      }
      pipeline.hSet(missionSetKey(input.teamId), input.missionId, payload);
      pipeline.expire(missionSetKey(input.teamId), CAPABILITY_TTL_SECONDS);
      await pipeline.exec();
    },

    async discoverMissions(input: {
      teamId: string;
      requiredCapabilities: string[];
      excludeMissionId: string;
    }): Promise<{
      missions: Array<{
        missionId: string;
        objective: string;
        capabilities: string[];
        availableSlots: number;
        matchScore: number;
      }>;
    }> {
      const requiredCapabilities = [
        ...new Set(
          input.requiredCapabilities.map(normalizeCapability).filter(Boolean)
        ),
      ];
      if (requiredCapabilities.length === 0) {
        return { missions: [] };
      }

      const redis = await getClient();
      const candidates = new Map<string, number>();

      for (const capability of requiredCapabilities) {
        const members = await redis.sMembers(
          capabilityKey(input.teamId, capability)
        );
        for (const missionId of members) {
          if (missionId === input.excludeMissionId) {
            continue;
          }
          candidates.set(missionId, (candidates.get(missionId) ?? 0) + 1);
        }
      }

      if (candidates.size === 0) {
        return { missions: [] };
      }

      const candidateMissionIds = [...candidates.keys()];
      const metadataRaw = await redis.hmGet(
        missionSetKey(input.teamId),
        candidateMissionIds
      );
      const metadataByMissionId = new Map<
        string,
        { objective?: string; capabilities?: string[] }
      >();
      for (const [index, missionId] of candidateMissionIds.entries()) {
        const raw = metadataRaw[index];
        if (!raw) {
          continue;
        }
        const parsed = parseMissionMetadata(raw);
        if (parsed) {
          metadataByMissionId.set(missionId, parsed);
        }
      }

      const activeMissions = await db.mission.findMany({
        where: {
          id: { in: candidateMissionIds },
          teamId: input.teamId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          objective: true,
          maxConcurrentRuns: true,
        },
      });
      if (activeMissions.length === 0) {
        return { missions: [] };
      }

      const runningByMission = await db.missionRun.groupBy({
        by: ["missionId"],
        where: {
          missionId: { in: activeMissions.map((mission) => mission.id) },
          status: "RUNNING",
        },
        _count: {
          missionId: true,
        },
      });
      const runningCountByMissionId = new Map(
        runningByMission.map((entry) => [
          entry.missionId,
          entry._count.missionId,
        ])
      );

      const missions = activeMissions
        .map((mission) => {
          const metadata = metadataByMissionId.get(mission.id);
          const runningCount = runningCountByMissionId.get(mission.id) ?? 0;
          const availableSlots = Math.max(
            0,
            mission.maxConcurrentRuns - runningCount
          );
          const matchScore =
            (candidates.get(mission.id) ?? 0) / requiredCapabilities.length;
          return {
            missionId: mission.id,
            objective: metadata?.objective ?? mission.objective,
            capabilities: metadata?.capabilities ?? [],
            availableSlots,
            matchScore,
          };
        })
        .filter((mission) => mission.availableSlots > 0)
        .sort(
          (a, b) =>
            b.matchScore - a.matchScore ||
            b.availableSlots - a.availableSlots ||
            a.missionId.localeCompare(b.missionId)
        );

      return { missions };
    },
  };
}
