export interface SessionStateClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

export interface S3SpillClient {
  upload(key: string, data: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export interface SessionStateOptions {
  client: SessionStateClient;
  s3Client?: S3SpillClient;
  keyPrefix?: string;
  sessionId: string;
  spillThresholdBytes?: number;
  defaultTtlSeconds?: number;
}

export interface SessionStateEntry<T = unknown> {
  value: T;
  createdAt: number;
  updatedAt: number;
  size: number;
  spilledToS3: boolean;
  s3Key?: string;
}

export interface SessionStateMetadata {
  key: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  spilledToS3: boolean;
}

export interface SessionState {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<SessionStateMetadata[]>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getSessionId(): string;
}

const DEFAULT_SPILL_THRESHOLD_BYTES = 512 * 1024;
const DEFAULT_TTL_SECONDS = 86_400;

export class SessionStateStore implements SessionState {
  private readonly client: SessionStateClient;
  private readonly s3Client?: S3SpillClient;
  private readonly keyPrefix: string;
  private readonly sessionId: string;
  private readonly spillThreshold: number;
  private readonly defaultTtlSeconds: number;

  constructor(options: SessionStateOptions) {
    this.client = options.client;
    this.s3Client = options.s3Client;
    this.sessionId = options.sessionId;
    this.keyPrefix = options.keyPrefix ?? "session:";
    this.spillThreshold =
      options.spillThresholdBytes ?? DEFAULT_SPILL_THRESHOLD_BYTES;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const raw = await this.client.get(fullKey);

    if (raw === null) {
      return null;
    }

    const entry = JSON.parse(raw) as SessionStateEntry<T>;

    if (entry.spilledToS3 && entry.s3Key && this.s3Client) {
      const buffer = await this.s3Client.download(entry.s3Key);
      return JSON.parse(buffer.toString("utf-8")) as T;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, "utf-8");
    const now = Date.now();
    const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : this.defaultTtlSeconds;

    let entry: SessionStateEntry<T>;

    if (size > this.spillThreshold && this.s3Client) {
      const s3Key = this.buildS3Key(key);
      await this.s3Client.upload(s3Key, Buffer.from(serialized, "utf-8"));

      entry = {
        value: null as unknown as T,
        createdAt: now,
        updatedAt: now,
        size,
        spilledToS3: true,
        s3Key,
      };
    } else {
      entry = {
        value,
        createdAt: now,
        updatedAt: now,
        size,
        spilledToS3: false,
      };
    }

    await this.client.set(fullKey, JSON.stringify(entry), ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    const raw = await this.client.get(fullKey);

    if (raw) {
      const entry = JSON.parse(raw) as SessionStateEntry;
      if (entry.spilledToS3 && entry.s3Key && this.s3Client) {
        await this.s3Client.delete(entry.s3Key);
      }
    }

    await this.client.del(fullKey);
  }

  async list(): Promise<SessionStateMetadata[]> {
    const pattern = this.buildKey("*");
    const keys = await this.client.keys(pattern);
    const prefix = this.buildKey("");

    const metadata: SessionStateMetadata[] = [];

    for (const fullKey of keys) {
      const raw = await this.client.get(fullKey);
      if (!raw) {
        continue;
      }

      const entry = JSON.parse(raw) as SessionStateEntry;
      const key = fullKey.slice(prefix.length);

      metadata.push({
        key,
        size: entry.size,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        spilledToS3: entry.spilledToS3,
      });
    }

    return metadata;
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const value = await this.client.get(fullKey);
    return value !== null;
  }

  async clear(): Promise<void> {
    const pattern = this.buildKey("*");
    const keys = await this.client.keys(pattern);

    for (const fullKey of keys) {
      const raw = await this.client.get(fullKey);
      if (raw) {
        const entry = JSON.parse(raw) as SessionStateEntry;
        if (entry.spilledToS3 && entry.s3Key && this.s3Client) {
          await this.s3Client.delete(entry.s3Key);
        }
      }
      await this.client.del(fullKey);
    }
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${this.sessionId}:${key}`;
  }

  private buildS3Key(key: string): string {
    return `session-state/${this.sessionId}/${key}`;
  }
}

export function createSessionState(options: SessionStateOptions): SessionState {
  return new SessionStateStore(options);
}

export class InMemorySessionStateClient implements SessionStateClient {
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

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryS3SpillClient implements S3SpillClient {
  private readonly store = new Map<string, Buffer>();

  upload(key: string, data: Buffer): Promise<string> {
    this.store.set(key, data);
    return Promise.resolve(key);
  }

  download(key: string): Promise<Buffer> {
    const data = this.store.get(key);
    if (!data) {
      return Promise.reject(new Error(`S3 key not found: ${key}`));
    }
    return Promise.resolve(data);
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  clear(): void {
    this.store.clear();
  }
}
