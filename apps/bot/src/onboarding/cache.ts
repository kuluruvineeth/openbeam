import { getRedisClient } from "@openbeam/redis";
import type { OnboardingState, UserJourneyStage } from "@openbeam/types/bot";
import { stageFromCount } from "@openbeam/types/bot";

const STATE_TTL = 90 * 24 * 3600;
const HINTS_TTL = 180 * 24 * 3600;
const LAST_SEEN_TTL = 30 * 24 * 3600;
const LAST_QUERY_TTL = 7 * 24 * 3600;
const CHIPS_TTL = 3600;
const RESOLUTION_TTL = 600;

function stateKey(teamId: string, userId: string): string {
  return `onboard:state:${teamId}:${userId}`;
}

function hintsKey(teamId: string, userId: string): string {
  return `onboard:hints:shown:${teamId}:${userId}`;
}

function lastSeenKey(teamId: string, userId: string): string {
  return `onboard:lastseen:${teamId}:${userId}`;
}

function lastQueryKey(teamId: string, userId: string): string {
  return `onboard:lastquery:${teamId}:${userId}`;
}

function chipsKey(teamId: string): string {
  return `onboard:chips:${teamId}`;
}

function resolutionKey(
  teamId: string,
  userId: string,
  queryHash: string
): string {
  return `onboard:resolution:${teamId}:${userId}:${queryHash}`;
}

const DEFAULT_STATE: OnboardingState = {
  queryCount: 0,
  stage: "TOURIST",
  discoveredCaps: [],
  streakDays: 0,
  lastStreakDate: null,
  resolvedCount: 0,
  unresolvedCount: 0,
};

export async function getOnboardingState(
  teamId: string,
  userId: string
): Promise<OnboardingState> {
  const redis = await getRedisClient();
  const raw = await redis.hGetAll(stateKey(teamId, userId));
  if (!raw.queryCount) {
    return DEFAULT_STATE;
  }
  return {
    queryCount: Number(raw.queryCount),
    stage: (raw.stage as UserJourneyStage) ?? "TOURIST",
    discoveredCaps: raw.discoveredCaps ? JSON.parse(raw.discoveredCaps) : [],
    streakDays: Number(raw.streakDays ?? 0),
    lastStreakDate: raw.lastStreakDate ?? null,
    resolvedCount: Number(raw.resolvedCount ?? 0),
    unresolvedCount: Number(raw.unresolvedCount ?? 0),
  };
}

export async function incrementQueryCount(
  teamId: string,
  userId: string
): Promise<{ queryCount: number; stage: UserJourneyStage }> {
  const redis = await getRedisClient();
  const k = stateKey(teamId, userId);
  const queryCount = await redis.hIncrBy(k, "queryCount", 1);
  const stage = stageFromCount(queryCount);
  await redis.hSet(k, "stage", stage);
  await redis.expire(k, STATE_TTL);
  return { queryCount, stage };
}

export async function recordLastSeen(
  teamId: string,
  userId: string
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(lastSeenKey(teamId, userId), new Date().toISOString(), {
    EX: LAST_SEEN_TTL,
  });
}

export async function getLastSeen(
  teamId: string,
  userId: string
): Promise<string | null> {
  const redis = await getRedisClient();
  return redis.get(lastSeenKey(teamId, userId));
}

export async function setLastQuery(
  teamId: string,
  userId: string,
  query: string
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(lastQueryKey(teamId, userId), query, { EX: LAST_QUERY_TTL });
}

export async function getLastQuery(
  teamId: string,
  userId: string
): Promise<string | null> {
  const redis = await getRedisClient();
  return redis.get(lastQueryKey(teamId, userId));
}

export async function isHintShown(
  teamId: string,
  userId: string,
  hintId: string
): Promise<boolean> {
  const redis = await getRedisClient();
  const result = await redis.sIsMember(hintsKey(teamId, userId), hintId);
  return Boolean(result);
}

export async function markHintShown(
  teamId: string,
  userId: string,
  hintId: string
): Promise<void> {
  const redis = await getRedisClient();
  const k = hintsKey(teamId, userId);
  await redis.sAdd(k, hintId);
  await redis.expire(k, HINTS_TTL);
}

export async function getChips(teamId: string): Promise<string[] | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(chipsKey(teamId));
  return raw ? (JSON.parse(raw) as string[]) : null;
}

export async function setChips(teamId: string, chips: string[]): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(chipsKey(teamId), JSON.stringify(chips), { EX: CHIPS_TTL });
}

export async function setResolutionMarker(
  teamId: string,
  userId: string,
  queryHash: string
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(
    resolutionKey(teamId, userId, queryHash),
    String(Date.now()),
    { EX: RESOLUTION_TTL }
  );
}

export async function hasResolutionMarker(
  teamId: string,
  userId: string,
  queryHash: string
): Promise<boolean> {
  const redis = await getRedisClient();
  const val = await redis.get(resolutionKey(teamId, userId, queryHash));
  return val !== null;
}
