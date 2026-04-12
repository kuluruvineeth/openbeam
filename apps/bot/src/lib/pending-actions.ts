import { getRedisClient } from "@openbeam/redis";
import type { BotPlatform } from "@openbeam/types/bot";

const TTL_SECONDS = 300;
const ID_LENGTH = 8;

interface PendingAction {
  pendingId: string;
  connectorId: string;
  actionId: string;
  params: Record<string, unknown>;
  teamId: string;
  userId: string;
  description: string;
  stakes: string;
  createdAt: number;
}

function key(platform: BotPlatform, userId: string, pendingId: string): string {
  return `pending_action:${platform}:${userId}:${pendingId}`;
}

function generateId(): string {
  return crypto.randomUUID().slice(0, ID_LENGTH);
}

export async function storePendingAction(
  platform: BotPlatform,
  userId: string,
  action: Omit<PendingAction, "pendingId" | "createdAt">
): Promise<string> {
  const redis = await getRedisClient();
  const pendingId = generateId();
  const entry: PendingAction = {
    ...action,
    pendingId,
    createdAt: Date.now(),
  };
  await redis.set(key(platform, userId, pendingId), JSON.stringify(entry), {
    EX: TTL_SECONDS,
  });
  return pendingId;
}

export async function resolvePendingAction(
  platform: BotPlatform,
  userId: string,
  pendingId: string
): Promise<PendingAction | null> {
  const redis = await getRedisClient();
  const k = key(platform, userId, pendingId);
  const raw = await redis.get(k);
  if (!raw) {
    return null;
  }
  await redis.del(k);
  return JSON.parse(raw) as PendingAction;
}

export async function getPendingAction(
  platform: BotPlatform,
  userId: string,
  pendingId: string
): Promise<PendingAction | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(key(platform, userId, pendingId));
  return raw ? (JSON.parse(raw) as PendingAction) : null;
}

export type { PendingAction };
