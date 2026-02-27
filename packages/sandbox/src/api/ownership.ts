import type { SandboxProviderType } from "../types";
import {
  getSandboxRedisClient,
  resetSandboxRedisClientForTests,
  type SandboxRedisClient,
} from "./redis-client";

type SandboxOwnershipKey = `${SandboxProviderType}:${string}`;

interface SandboxOwnershipStore {
  get(
    provider: SandboxProviderType,
    sandboxId: string
  ): Promise<string | undefined>;
  set(
    provider: SandboxProviderType,
    sandboxId: string,
    teamId: string
  ): Promise<void>;
  delete(provider: SandboxProviderType, sandboxId: string): Promise<void>;
  clear(): void;
}

class InMemorySandboxOwnershipStore implements SandboxOwnershipStore {
  private readonly ownershipBySandbox = new Map<SandboxOwnershipKey, string>();

  private key(
    provider: SandboxProviderType,
    sandboxId: string
  ): SandboxOwnershipKey {
    return `${provider}:${sandboxId}`;
  }

  get(
    provider: SandboxProviderType,
    sandboxId: string
  ): Promise<string | undefined> {
    return Promise.resolve(
      this.ownershipBySandbox.get(this.key(provider, sandboxId))
    );
  }

  set(
    provider: SandboxProviderType,
    sandboxId: string,
    teamId: string
  ): Promise<void> {
    this.ownershipBySandbox.set(this.key(provider, sandboxId), teamId);
    return Promise.resolve();
  }

  delete(provider: SandboxProviderType, sandboxId: string): Promise<void> {
    this.ownershipBySandbox.delete(this.key(provider, sandboxId));
    return Promise.resolve();
  }

  clear(): void {
    this.ownershipBySandbox.clear();
  }
}

const DEFAULT_OWNERSHIP_KEY_PREFIX = "openplane:sandbox:ownership";
const DEFAULT_OWNERSHIP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getOwnershipKeyPrefix(): string {
  const prefix = process.env.SANDBOX_OWNERSHIP_KEY_PREFIX?.trim();
  return prefix && prefix.length > 0 ? prefix : DEFAULT_OWNERSHIP_KEY_PREFIX;
}

function getOwnershipTtlMs(): number {
  return parsePositiveInt(
    process.env.SANDBOX_OWNERSHIP_TTL_MS,
    DEFAULT_OWNERSHIP_TTL_MS
  );
}

class RedisSandboxOwnershipStore implements SandboxOwnershipStore {
  private readonly redis: SandboxRedisClient;
  private readonly keyPrefix: string;
  private readonly ttlMs: number;

  constructor(redis: SandboxRedisClient, keyPrefix: string, ttlMs: number) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
    this.ttlMs = ttlMs;
  }

  private key(provider: SandboxProviderType, sandboxId: string): string {
    return `${this.keyPrefix}:${provider}:${sandboxId}`;
  }

  async get(
    provider: SandboxProviderType,
    sandboxId: string
  ): Promise<string | undefined> {
    const value = await this.redis.get(this.key(provider, sandboxId));
    return value ?? undefined;
  }

  async set(
    provider: SandboxProviderType,
    sandboxId: string,
    teamId: string
  ): Promise<void> {
    await this.redis.set(this.key(provider, sandboxId), teamId, {
      PX: this.ttlMs,
    });
  }

  async delete(
    provider: SandboxProviderType,
    sandboxId: string
  ): Promise<void> {
    await this.redis.del(this.key(provider, sandboxId));
  }

  clear(): void {
    /* noop for redis-backed store */
  }
}

function resolveOwnershipStoreKind(): "memory" | "redis" {
  if (process.env.SANDBOX_OWNERSHIP_STORE?.toLowerCase() === "redis") {
    return "redis";
  }
  return "memory";
}

const inMemoryOwnershipStore = new InMemorySandboxOwnershipStore();
let resolvedOwnershipStore: SandboxOwnershipStore | null = null;
let resolvingOwnershipStore: Promise<SandboxOwnershipStore> | null = null;

function resolveOwnershipStore(): Promise<SandboxOwnershipStore> {
  if (resolvedOwnershipStore) {
    return Promise.resolve(resolvedOwnershipStore);
  }
  if (resolvingOwnershipStore) {
    return resolvingOwnershipStore;
  }

  resolvingOwnershipStore = (async () => {
    if (resolveOwnershipStoreKind() === "redis") {
      const redis = await getSandboxRedisClient();
      if (redis) {
        resolvedOwnershipStore = new RedisSandboxOwnershipStore(
          redis,
          getOwnershipKeyPrefix(),
          getOwnershipTtlMs()
        );
        return resolvedOwnershipStore;
      }
    }

    resolvedOwnershipStore = inMemoryOwnershipStore;
    return resolvedOwnershipStore;
  })().finally(() => {
    resolvingOwnershipStore = null;
  });

  return resolvingOwnershipStore;
}

export function getSandboxOwnerTeamId(
  provider: SandboxProviderType,
  sandboxId: string
): Promise<string | undefined> {
  return resolveOwnershipStore().then((store) =>
    store.get(provider, sandboxId)
  );
}

export async function setSandboxOwnerTeamId(
  provider: SandboxProviderType,
  sandboxId: string,
  teamId: string | undefined
): Promise<void> {
  if (!teamId) {
    return;
  }
  const store = await resolveOwnershipStore();
  await store.set(provider, sandboxId, teamId);
}

export async function deleteSandboxOwnerTeamId(
  provider: SandboxProviderType,
  sandboxId: string
): Promise<void> {
  const store = await resolveOwnershipStore();
  await store.delete(provider, sandboxId);
}

export function clearSandboxOwnershipStore(): void {
  inMemoryOwnershipStore.clear();
  resolvedOwnershipStore = null;
  resolvingOwnershipStore = null;
  resetSandboxRedisClientForTests();
}
