import { createClient, type RedisClientType } from "redis";

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

type BullMqRedisOptions = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  connectionName?: string;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number | null;
  retryStrategy?: (attempts: number) => number | null;
  lazyConnect?: boolean;
  tls?: Record<string, unknown>;
};

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

/**
 * Get or create a singleton Redis client instance
 * Uses node-redis v5 with Bun runtime
 */
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
            console.error("Redis: Max reconnection attempts reached");
            return new Error("Max reconnection attempts reached");
          }

          return Math.min(retries * reconnectBaseDelay, reconnectMaxDelay);
        },
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis: Connected");
    });

    redisClient.on("reconnecting", () => {
      console.log("Redis: Reconnecting...");
    });

    redisClient.on("ready", () => {
      console.log("Redis: Ready to accept commands");
    });

    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Close the Redis connection gracefully
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("Redis: Connection closed");
  }
}

/**
 * Get Redis connection configuration for BullMQ
 * BullMQ expects ioredis connection options
 */
export function getRedisConnection(): BullMqRedisOptions {
  const enableReadyCheck = process.env.REDIS_ENABLE_READY_CHECK !== "false";
  const maxRetriesPerRequest = Number.parseInt(
    process.env.REDIS_MAX_RETRIES_PER_REQUEST || "2",
    10
  );
  const retryBaseDelay =
    Number.parseInt(process.env.REDIS_RETRY_DELAY_MS || "500", 10) || 500;
  const retryMaxDelay =
    Number.parseInt(process.env.REDIS_RETRY_MAX_DELAY_MS || "5000", 10) || 5000;

  const options: BullMqRedisOptions = {
    host: redisConfig.host,
    port: redisConfig.port,
    username: redisConfig.username,
    password: redisConfig.password,
    db: redisConfig.db,
    connectionName: process.env.REDIS_CONNECTION_NAME,
    enableReadyCheck,
    maxRetriesPerRequest,
    retryStrategy: (attempts: number) =>
      Math.min(attempts * retryBaseDelay, retryMaxDelay),
    lazyConnect: true,
  };

  if (redisConfig.isTls) {
    const rejectUnauthorized =
      process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false";
    options.tls = { rejectUnauthorized };
  }

  return options;
}

export { redisClient };
