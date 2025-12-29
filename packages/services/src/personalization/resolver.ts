import {
  type Database,
  findUserSearchProfile,
  getTeamProfileStats,
  type ParsedUserSearchProfile,
} from "@openplane/db";
import {
  type CachedUserEmbeddings,
  type CachedUserProfile,
  getUserProfileCache,
} from "@openplane/redis";
import type { PersonalizationContext, ResolvedUserProfile } from "./types";
import { deserializeEmbedding, serializeEmbedding } from "./utils";

export { serializeEmbedding };

const cache = getUserProfileCache();

const NEW_USER_THRESHOLD = 5;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

export async function resolveUserProfile(
  db: Database,
  ctx: PersonalizationContext
): Promise<ResolvedUserProfile> {
  const cached = await cache.getProfile(ctx.teamId, ctx.userId);

  if (cached && !isStale(cached.cachedAt)) {
    const embeddings = await cache.getEmbeddings(ctx.teamId, ctx.userId);
    return buildFromCache(cached, embeddings);
  }

  const dbProfile = await findUserSearchProfile(db, ctx.userId, ctx.teamId);

  if (dbProfile) {
    const resolved = buildFromDatabase(dbProfile);
    await cacheProfile(resolved);
    return resolved;
  }

  const defaults = await getTeamDefaults(db, ctx.teamId);
  return buildWithDefaults(ctx, defaults);
}

async function getTeamDefaults(
  db: Database,
  teamId: string
): Promise<ResolvedUserProfile> {
  const cachedDefaults = await cache.getTeamDefaults(teamId);

  if (cachedDefaults) {
    return {
      userId: "",
      teamId,
      department: null,
      searchCount: cachedDefaults.avgSearchCount,
      clickCount: cachedDefaults.avgClickCount,
      avgDwellMs: null,
      connectorWeights: cachedDefaults.connectorWeights,
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

  const stats = await getTeamProfileStats(db, teamId);

  if (!stats) {
    return buildEmptyDefaults(teamId);
  }

  await cache.setTeamDefaults({
    teamId,
    connectorWeights: stats.connectorWeights,
    avgSearchCount: stats.avgSearchCount,
    avgClickCount: stats.avgClickCount,
    cachedAt: Date.now(),
  });

  return {
    userId: "",
    teamId,
    department: null,
    searchCount: stats.avgSearchCount,
    clickCount: stats.avgClickCount,
    avgDwellMs: null,
    connectorWeights: stats.connectorWeights,
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

function buildFromCache(
  cached: CachedUserProfile,
  embeddings: CachedUserEmbeddings | null
): ResolvedUserProfile {
  return {
    userId: cached.userId,
    teamId: cached.teamId,
    department: cached.department,
    searchCount: cached.searchCount,
    clickCount: cached.clickCount,
    avgDwellMs: cached.avgDwellMs,
    connectorWeights: cached.connectorWeights,
    authorInteractions: cached.authorInteractions,
    topicWeights: cached.topicWeights,
    queryEmbedding: embeddings?.queryEmbedding ?? null,
    docEmbedding: embeddings?.docEmbedding ?? null,
    isNewUser: cached.searchCount < NEW_USER_THRESHOLD,
    personalizationEnabled: cached.personalizationEnabled,
    resolvedAt: Date.now(),
    source: "cache",
  };
}

function buildFromDatabase(
  dbProfile: ParsedUserSearchProfile
): ResolvedUserProfile {
  return {
    userId: dbProfile.userId,
    teamId: dbProfile.teamId,
    department: dbProfile.department,
    searchCount: dbProfile.searchCount,
    clickCount: dbProfile.clickCount,
    avgDwellMs: dbProfile.avgDwellMs,
    connectorWeights: dbProfile.connectorWeights,
    authorInteractions: dbProfile.authorInteractions,
    topicWeights: dbProfile.topicWeights,
    queryEmbedding: dbProfile.queryEmbedding
      ? deserializeEmbedding(dbProfile.queryEmbedding)
      : null,
    docEmbedding: dbProfile.docEmbedding
      ? deserializeEmbedding(dbProfile.docEmbedding)
      : null,
    isNewUser: dbProfile.searchCount < NEW_USER_THRESHOLD,
    personalizationEnabled: dbProfile.personalizationEnabled,
    resolvedAt: Date.now(),
    source: "database",
  };
}

function buildWithDefaults(
  ctx: PersonalizationContext,
  defaults: ResolvedUserProfile
): ResolvedUserProfile {
  return {
    ...defaults,
    userId: ctx.userId,
    isNewUser: true,
    source: "defaults",
  };
}

function buildEmptyDefaults(teamId: string): ResolvedUserProfile {
  return {
    userId: "",
    teamId,
    department: null,
    searchCount: 0,
    clickCount: 0,
    avgDwellMs: null,
    connectorWeights: {},
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

async function cacheProfile(profile: ResolvedUserProfile): Promise<void> {
  await cache.setProfile({
    userId: profile.userId,
    teamId: profile.teamId,
    department: profile.department,
    searchCount: profile.searchCount,
    clickCount: profile.clickCount,
    avgDwellMs: profile.avgDwellMs,
    connectorWeights: profile.connectorWeights,
    authorInteractions: profile.authorInteractions,
    topicWeights: profile.topicWeights,
    personalizationEnabled: profile.personalizationEnabled,
    cachedAt: Date.now(),
  });

  if (profile.queryEmbedding || profile.docEmbedding) {
    await cache.setEmbeddings(profile.teamId, {
      userId: profile.userId,
      queryEmbedding: profile.queryEmbedding,
      docEmbedding: profile.docEmbedding,
      version: 0,
      cachedAt: Date.now(),
    });
  }
}

function isStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > STALE_THRESHOLD_MS;
}
