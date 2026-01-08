export interface ShortTermMemoryClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<void>;
}

export interface ShortTermMemoryOptions {
  client: ShortTermMemoryClient;
  keyPrefix?: string;
  defaultTtlSeconds?: number;
}

export interface ShortTermMemory {
  store<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  retrieve<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  extend(key: string, ttlMs: number): Promise<void>;
}

const DEFAULT_TTL_SECONDS = 3600;

export class ShortTermMemoryStore implements ShortTermMemory {
  private readonly client: ShortTermMemoryClient;
  private readonly keyPrefix: string;
  private readonly defaultTtlSeconds: number;

  constructor(options: ShortTermMemoryOptions) {
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? "stm:";
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
  }

  async store<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const fullKey = this.prefixKey(key);
    const serialized = JSON.stringify(value);
    const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : this.defaultTtlSeconds;

    await this.client.set(fullKey, serialized, ttlSeconds);
  }

  async retrieve<T>(key: string): Promise<T | null> {
    const fullKey = this.prefixKey(key);
    const value = await this.client.get(fullKey);

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.prefixKey(key);
    await this.client.del(fullKey);
  }

  async list(prefix: string): Promise<string[]> {
    const pattern = `${this.keyPrefix}${prefix}*`;
    const keys = await this.client.keys(pattern);
    return keys.map((k) => k.slice(this.keyPrefix.length));
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.retrieve(key);
    return value !== null;
  }

  async extend(key: string, ttlMs: number): Promise<void> {
    const fullKey = this.prefixKey(key);
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    await this.client.expire(fullKey, ttlSeconds);
  }

  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}

export function createShortTermMemory(
  options: ShortTermMemoryOptions
): ShortTermMemory {
  return new ShortTermMemoryStore(options);
}

export class InMemoryShortTermClient implements ShortTermMemoryClient {
  private readonly store = new Map<
    string,
    { value: string; expiresAt?: number }
  >();

  get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return Promise.resolve(null);
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value);
  }

  set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;

    this.store.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  del(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      `^${pattern.replace(/\*/g, ".*").replace(/\?/g, ".")}$`
    );

    const result: string[] = [];
    for (const key of this.store.keys()) {
      const entry = this.store.get(key);
      if (entry?.expiresAt && Date.now() > entry.expiresAt) {
        this.store.delete(key);
        continue;
      }

      if (regex.test(key)) {
        result.push(key);
      }
    }

    return Promise.resolve(result);
  }

  expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
    return Promise.resolve();
  }

  clear(): void {
    this.store.clear();
  }
}
