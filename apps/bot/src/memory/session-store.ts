import db from "@openbeam/db";
import { getRedisClient } from "@openbeam/redis";
import { ContextSessionManager } from "@openbeam/services";
import type {
  BotPlatform,
  SessionData,
  SessionTurn,
} from "@openbeam/types/bot";

const noop = Function.prototype as () => void;

const SESSION_ID_TTL = 7 * 86_400;
const BUFFER_LIMIT = 20;

let _sessionManager: ContextSessionManager | null = null;

function getSessionManager(): ContextSessionManager {
  _sessionManager ??= new ContextSessionManager(db);
  return _sessionManager;
}

function sessionIdKey(
  platform: BotPlatform,
  channelId: string,
  userId: string
): string {
  return `bot:sid:${platform.toLowerCase()}:${channelId}:${userId}`;
}

function bufferKey(
  platform: BotPlatform,
  channelId: string,
  userId: string
): string {
  return `bot:buf:${platform.toLowerCase()}:${channelId}:${userId}`;
}

function summaryKey(
  platform: BotPlatform,
  channelId: string,
  userId: string
): string {
  return `bot:sum:${platform.toLowerCase()}:${channelId}:${userId}`;
}

async function resolveSessionId(
  platform: BotPlatform,
  channelId: string,
  userId: string,
  teamId: string
): Promise<string> {
  const redis = await getRedisClient();
  const key = sessionIdKey(platform, channelId, userId);
  const cached = await redis.get(key);
  if (cached) {
    return cached;
  }

  const session = await getSessionManager().create(teamId, userId);
  await redis.set(key, session.id, { EX: SESSION_ID_TTL });
  return session.id;
}

interface AppendTurnParams {
  platform: BotPlatform;
  channelId: string;
  userId: string;
  teamId: string;
}

export async function appendTurn(
  params: AppendTurnParams,
  turn: SessionTurn
): Promise<void> {
  const { platform, channelId, userId, teamId } = params;
  const sessionId = await resolveSessionId(platform, channelId, userId, teamId);
  const redis = await getRedisClient();
  const bKey = bufferKey(platform, channelId, userId);

  const pipeline = redis.multi();
  pipeline.rPush(bKey, JSON.stringify(turn));
  pipeline.lTrim(bKey, -BUFFER_LIMIT, -1);
  pipeline.expire(bKey, SESSION_ID_TTL);
  await pipeline.exec();

  getSessionManager()
    .addMessage(sessionId, turn.role, turn.content)
    .catch(noop);
}

export async function getSession(
  platform: BotPlatform,
  channelId: string,
  userId: string
): Promise<SessionData> {
  const redis = await getRedisClient();
  const bKey = bufferKey(platform, channelId, userId);
  const sKey = summaryKey(platform, channelId, userId);

  const [rawMessages, summary] = await Promise.all([
    redis.lRange(bKey, 0, -1),
    redis.get(sKey),
  ]);

  const buffer: SessionTurn[] = rawMessages
    .map((m) => {
      try {
        return JSON.parse(m) as SessionTurn;
      } catch {
        return null;
      }
    })
    .filter((m): m is SessionTurn => m !== null);

  return { buffer, summary };
}

export async function storeSummary(
  platform: BotPlatform,
  channelId: string,
  userId: string,
  summary: string
): Promise<void> {
  const redis = await getRedisClient();
  const sKey = summaryKey(platform, channelId, userId);
  await redis.set(sKey, summary, { EX: SESSION_ID_TTL });
}

export async function clearSession(
  platform: BotPlatform,
  channelId: string,
  userId: string
): Promise<void> {
  const redis = await getRedisClient();
  const sidKey = sessionIdKey(platform, channelId, userId);
  const bKey = bufferKey(platform, channelId, userId);
  const sKey = summaryKey(platform, channelId, userId);

  const sessionId = await redis.get(sidKey);
  await Promise.all([redis.del(sidKey), redis.del(bKey), redis.del(sKey)]);

  if (sessionId) {
    getSessionManager().commit(sessionId).catch(noop);
  }
}
