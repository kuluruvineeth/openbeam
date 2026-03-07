import {
  type Database,
  findUserSearchProfilesByTeam,
  type ParsedUserSearchProfile,
} from "@openbeam/db";
import type { ResolvedUserProfile } from "./types";

interface ColdStartContext {
  db: Database;
  userId: string;
  teamId: string;
  department: string | null;
}

const MIN_DEPARTMENT_PROFILES = 3;
const MIN_TEAM_PROFILES = 5;
const MAX_PROFILES_TO_SAMPLE = 100;

export async function resolveColdStartProfile(
  ctx: ColdStartContext
): Promise<ResolvedUserProfile> {
  if (ctx.department) {
    const departmentProfile = await getDepartmentAverageProfile(ctx);
    if (departmentProfile) {
      return departmentProfile;
    }
  }

  const teamProfile = await getTeamAverageProfile(ctx);
  if (teamProfile) {
    return teamProfile;
  }

  return getGlobalDefaults(ctx);
}

async function getDepartmentAverageProfile(
  ctx: ColdStartContext
): Promise<ResolvedUserProfile | null> {
  if (!ctx.department) {
    return null;
  }

  const departmentProfiles = await findUserSearchProfilesByTeam(
    ctx.db,
    ctx.teamId,
    {
      minSearchCount: 10,
      department: ctx.department,
      limit: MAX_PROFILES_TO_SAMPLE,
    }
  );

  if (departmentProfiles.length < MIN_DEPARTMENT_PROFILES) {
    return null;
  }

  return aggregateProfiles(ctx, departmentProfiles);
}

async function getTeamAverageProfile(
  ctx: ColdStartContext
): Promise<ResolvedUserProfile | null> {
  const teamProfiles = await findUserSearchProfilesByTeam(ctx.db, ctx.teamId, {
    minSearchCount: 10,
    limit: MAX_PROFILES_TO_SAMPLE,
  });

  if (teamProfiles.length < MIN_TEAM_PROFILES) {
    return null;
  }

  return aggregateProfiles(ctx, teamProfiles);
}

function getGlobalDefaults(ctx: ColdStartContext): ResolvedUserProfile {
  return {
    userId: ctx.userId,
    teamId: ctx.teamId,
    department: ctx.department,
    searchCount: 0,
    clickCount: 0,
    avgDwellMs: null,
    connectorWeights: {
      "google-drive": 1.0,
      slack: 0.8,
      notion: 0.7,
      gmail: 0.6,
      linear: 0.5,
    },
    authorInteractions: {},
    topicWeights: {},
    queryEmbedding: null,
    docEmbedding: null,
    isNewUser: true,
    personalizationEnabled: true,
    resolvedAt: Date.now(),
    source: "defaults",
  };
}

function aggregateProfiles(
  ctx: ColdStartContext,
  profiles: ParsedUserSearchProfile[]
): ResolvedUserProfile {
  const connectorWeightMaps = profiles.map((p) => p.connectorWeights);
  const topicWeightMaps = profiles.map((p) => p.topicWeights);

  const avgSearchCount = Math.round(
    profiles.reduce((sum, p) => sum + p.searchCount, 0) / profiles.length
  );
  const avgClickCount = Math.round(
    profiles.reduce((sum, p) => sum + p.clickCount, 0) / profiles.length
  );

  const dwellValues = profiles
    .filter((p) => p.avgDwellMs !== null)
    .map((p) => p.avgDwellMs as number);
  const avgDwellMs =
    dwellValues.length > 0
      ? dwellValues.reduce((a, b) => a + b, 0) / dwellValues.length
      : null;

  return {
    userId: ctx.userId,
    teamId: ctx.teamId,
    department: ctx.department,
    searchCount: avgSearchCount,
    clickCount: avgClickCount,
    avgDwellMs,
    connectorWeights: aggregateWeightMaps(connectorWeightMaps),
    authorInteractions: {},
    topicWeights: aggregateWeightMaps(topicWeightMaps),
    queryEmbedding: null,
    docEmbedding: null,
    isNewUser: true,
    personalizationEnabled: true,
    resolvedAt: Date.now(),
    source: "defaults",
  };
}

function aggregateWeightMaps(
  maps: Record<string, number>[]
): Record<string, number> {
  const aggregated: Record<string, number[]> = {};

  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      if (!aggregated[key]) {
        aggregated[key] = [];
      }
      aggregated[key]?.push(value);
    }
  }

  const result: Record<string, number> = {};
  for (const [key, values] of Object.entries(aggregated)) {
    result[key] = values.reduce((a, b) => a + b, 0) / values.length;
  }

  return result;
}
