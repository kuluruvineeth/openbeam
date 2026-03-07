import { getRedisClient } from "@openbeam/redis";

const WATCH_STATE_PREFIX = "notion:watch:";
const WATCH_EXPIRY_BUFFER = 3600;

export interface NotionWatchState {
  connectorId: string;
  webhookId: string;
  webhookSecret: string;
  workspaceId: string;
  createdAt: number;
  expiresAt?: number;
}

export async function getWatchState(
  connectorId: string
): Promise<NotionWatchState | null> {
  const redis = await getRedisClient();
  const key = `${WATCH_STATE_PREFIX}${connectorId}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as NotionWatchState;
}

export async function setWatchState(
  connectorId: string,
  state: NotionWatchState
): Promise<void> {
  const redis = await getRedisClient();
  const key = `${WATCH_STATE_PREFIX}${connectorId}`;
  const ttl = state.expiresAt
    ? Math.max(
        0,
        Math.floor((state.expiresAt - Date.now()) / 1000) + WATCH_EXPIRY_BUFFER
      )
    : undefined;

  if (ttl) {
    await redis.setEx(key, ttl, JSON.stringify(state));
  } else {
    await redis.set(key, JSON.stringify(state));
  }
}

export async function deleteWatchState(connectorId: string): Promise<void> {
  const redis = await getRedisClient();
  const key = `${WATCH_STATE_PREFIX}${connectorId}`;
  await redis.del(key);
}

export async function getWatchStateByWebhookId(
  webhookId: string
): Promise<NotionWatchState | null> {
  const redis = await getRedisClient();
  const pattern = `${WATCH_STATE_PREFIX}*`;
  const keys = await redis.keys(pattern);

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const state = JSON.parse(data) as NotionWatchState;
      if (state.webhookId === webhookId) {
        return state;
      }
    }
  }

  return null;
}

export async function getAllActiveWatches(): Promise<NotionWatchState[]> {
  const redis = await getRedisClient();
  const pattern = `${WATCH_STATE_PREFIX}*`;
  const keys = await redis.keys(pattern);

  const states: NotionWatchState[] = [];

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      states.push(JSON.parse(data) as NotionWatchState);
    }
  }

  return states;
}

export async function getExpiringWatches(
  bufferSeconds = 3600
): Promise<NotionWatchState[]> {
  const watches = await getAllActiveWatches();
  const threshold = Date.now() + bufferSeconds * 1000;

  return watches.filter(
    (watch) => watch.expiresAt && watch.expiresAt < threshold
  );
}
