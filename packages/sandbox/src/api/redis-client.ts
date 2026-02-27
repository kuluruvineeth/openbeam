type RedisSetOptions = {
  PX?: number;
};

type RedisEvalOptions = {
  keys: string[];
  arguments: string[];
};

export type SandboxRedisClient = {
  connect?: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (
    key: string,
    value: string,
    options?: RedisSetOptions
  ) => Promise<unknown>;
  del: (key: string | string[]) => Promise<number>;
  eval: (script: string, options: RedisEvalOptions) => Promise<unknown>;
};

type RedisModule = {
  createClient: (config?: { url?: string }) => SandboxRedisClient;
};

let cachedClient: SandboxRedisClient | null = null;
let cachedClientPromise: Promise<SandboxRedisClient | null> | null = null;

function resolveRedisUrl(): string | null {
  const explicit = process.env.SANDBOX_REDIS_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }

  const fallback = process.env.REDIS_URL;
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return null;
}

async function loadRedisModule(): Promise<RedisModule | null> {
  const importModule = new Function("name", "return import(name);") as (
    name: string
  ) => Promise<unknown>;
  const module = await importModule("redis").catch(() => null);
  if (
    !module ||
    typeof (module as { createClient?: unknown }).createClient !== "function"
  ) {
    return null;
  }

  return module as RedisModule;
}

export function getSandboxRedisClient(): Promise<SandboxRedisClient | null> {
  if (cachedClient) {
    return Promise.resolve(cachedClient);
  }
  if (cachedClientPromise) {
    return cachedClientPromise;
  }

  cachedClientPromise = (async () => {
    const url = resolveRedisUrl();
    if (!url) {
      return null;
    }

    const redis = await loadRedisModule();
    if (!redis) {
      return null;
    }

    const client = redis.createClient({ url });
    if (client.connect) {
      await client.connect();
    }
    cachedClient = client;
    return client;
  })()
    .catch(() => null)
    .finally(() => {
      cachedClientPromise = null;
    });

  return cachedClientPromise;
}

export function resetSandboxRedisClientForTests(): void {
  cachedClient = null;
  cachedClientPromise = null;
}
