import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

function hashUri(uri: string): string {
  return createHash("md5").update(uri).digest("hex").slice(0, 16);
}

const L0_TTL = 3600;

function l0Key(teamId: string, uriHash: string): string {
  return `ctx:l0:${teamId}:${uriHash}`;
}

function hotKey(teamId: string, uriHash: string): string {
  return `ctx:hot:${teamId}:${uriHash}`;
}

function indexKey(teamId: string): string {
  return `ctx:idx:${teamId}`;
}

export { hashUri };

export class ContextCache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async getL0(teamId: string, uri: string): Promise<string | null> {
    try {
      const client = await this.getClient();
      const hash = hashUri(uri);
      return await client.get(l0Key(teamId, hash));
    } catch {
      return null;
    }
  }

  async setL0(
    teamId: string,
    uri: string,
    abstractText: string,
    ttl = L0_TTL
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const hash = hashUri(uri);
      await client.set(l0Key(teamId, hash), abstractText, { EX: ttl });
      await client.sAdd(indexKey(teamId), hash);
    } catch {
      return;
    }
  }

  async mgetL0(teamId: string, uris: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (uris.length === 0) {
      return result;
    }

    try {
      const client = await this.getClient();
      const hashes = uris.map(hashUri);
      const keys = hashes.map((h) => l0Key(teamId, h));
      const values = await client.mGet(keys);

      for (let i = 0; i < uris.length; i += 1) {
        const uri = uris[i];
        const value = values[i];
        if (uri !== undefined && value != null) {
          result.set(uri, value);
        }
      }

      return result;
    } catch {
      return result;
    }
  }

  async invalidateL0(teamId: string, uri: string): Promise<void> {
    try {
      const client = await this.getClient();
      const hash = hashUri(uri);
      await client.del(l0Key(teamId, hash));
      await client.sRem(indexKey(teamId), hash);
    } catch {
      return;
    }
  }

  async invalidateTeam(teamId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const idx = indexKey(teamId);
      const hashes = await client.sMembers(idx);

      if (hashes.length === 0) {
        return;
      }

      const l0Keys = hashes.map((h) => l0Key(teamId, h));
      const hotKeys = hashes.map((h) => hotKey(teamId, h));
      await client.del([idx, ...l0Keys, ...hotKeys]);
    } catch {
      return;
    }
  }

  async incrementHotness(teamId: string, uri: string): Promise<number> {
    try {
      const client = await this.getClient();
      const hash = hashUri(uri);
      return await client.incr(hotKey(teamId, hash));
    } catch {
      return 0;
    }
  }

  async getHotness(teamId: string, uri: string): Promise<number> {
    try {
      const client = await this.getClient();
      const hash = hashUri(uri);
      const value = await client.get(hotKey(teamId, hash));
      return value != null ? Number.parseInt(value, 10) : 0;
    } catch {
      return 0;
    }
  }

  async batchGetHotness(
    teamId: string,
    uris: string[]
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (uris.length === 0) {
      return result;
    }

    try {
      const client = await this.getClient();
      const hashes = uris.map(hashUri);
      const keys = hashes.map((h) => hotKey(teamId, h));
      const values = await client.mGet(keys);

      for (let i = 0; i < uris.length; i += 1) {
        const uri = uris[i];
        const value = values[i];
        if (uri !== undefined) {
          result.set(uri, value != null ? Number.parseInt(value, 10) : 0);
        }
      }

      return result;
    } catch {
      return result;
    }
  }
}

let contextCacheInstance: ContextCache | null = null;

export function getContextCache(): ContextCache {
  if (!contextCacheInstance) {
    contextCacheInstance = new ContextCache();
  }
  return contextCacheInstance;
}

export function resetContextCache(): void {
  contextCacheInstance = null;
}
