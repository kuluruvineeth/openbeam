import { createClient, type RedisClientType } from "redis";
import { redisLogger } from "./lib/logger";

type ParsedRedisConfig = {
  rawUrl: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  isTls: boolean;
};

const DEFAULT_REDIS_URL = "redis://localhost:6379";

function parseRedisConfig(): ParsedRedisConfig {
  const rawUrl = process.env.REDIS_URL || DEFAULT_REDIS_URL;
  const url = new URL(rawUrl);

  const port = Number.parseInt(url.port || "6379", 10);
  const username = process.env.REDIS_USERNAME || url.username || undefined;
  const password = process.env.REDIS_PASSWORD || url.password || undefined;

  const dbFromEnv = process.env.REDIS_DB;
  const dbFromPath =
    url.pathname && url.pathname !== "/"
      ? Number.parseInt(url.pathname.slice(1), 10)
      : undefined;
  const envDb = dbFromEnv ? Number.parseInt(dbFromEnv, 10) : undefined;
  const parsedEnvDb =
    envDb !== undefined && !Number.isNaN(envDb) ? envDb : undefined;
  const parsedPathDb =
    dbFromPath !== undefined && !Number.isNaN(dbFromPath)
      ? dbFromPath
      : undefined;
  const db = parsedEnvDb ?? parsedPathDb;

  return {
    rawUrl,
    host: url.hostname,
    port,
    username,
    password,
    db,
    isTls: url.protocol === "rediss:",
  };
}

const redisConfig = parseRedisConfig();

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    const reconnectMaxRetries =
      Number.parseInt(process.env.REDIS_SOCKET_MAX_RETRIES || "10", 10) || 10;
    const reconnectBaseDelay =
      Number.parseInt(process.env.REDIS_SOCKET_RETRY_DELAY_MS || "50", 10) ||
      50;
    const reconnectMaxDelay =
      Number.parseInt(process.env.REDIS_SOCKET_RETRY_MAX_MS || "3000", 10) ||
      3000;

    redisClient = createClient({
      url: redisConfig.rawUrl,
      username: redisConfig.username,
      password: redisConfig.password,
      database: redisConfig.db,
      name: process.env.REDIS_CONNECTION_NAME,
      socket: {
        tls: redisConfig.isTls ? true : undefined,
        reconnectStrategy: (retries) => {
          if (retries > reconnectMaxRetries) {
            redisLogger.error("Redis: Max reconnection attempts reached");
            return new Error("Max reconnection attempts reached");
          }

          return Math.min(retries * reconnectBaseDelay, reconnectMaxDelay);
        },
      },
    });

    redisClient.on("error", (err) => {
      redisLogger.error("Redis client error", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    redisClient.on("connect", () => {
      redisLogger.info("Redis: Connected");
    });

    redisClient.on("reconnecting", () => {
      redisLogger.warn("Redis: Reconnecting...");
    });

    redisClient.on("ready", () => {
      redisLogger.info("Redis: Ready to accept commands");
    });

    await redisClient.connect();
  }

  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisLogger.info("Redis: Connection closed");
  }
}

export { redisClient };
