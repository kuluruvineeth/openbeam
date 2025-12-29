import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";
import {
  EMBEDDING_CACHE_TTL,
  PROFILE_CACHE_TTL,
  ProfileCacheKeys,
  TEAM_DEFAULTS_TTL,
} from "./profile-keys";

export interface CachedUserProfile {
  userId: string;
  teamId: string;
  department: string | null;
  searchCount: number;
  clickCount: number;
  avgDwellMs: number | null;
  connectorWeights: Record<string, number>;
  authorInteractions: Record<string, number>;
  topicWeights: Record<string, number>;
  personalizationEnabled: boolean;
  cachedAt: number;
}

export interface CachedUserEmbeddings {
  userId: string;
  queryEmbedding: number[] | null;
  docEmbedding: number[] | null;
  version: number;
  cachedAt: number;
}

export interface TeamDefaults {
  teamId: string;
  connectorWeights: Record<string, number>;
  avgSearchCount: number;
  avgClickCount: number;
  cachedAt: number;
}

export class UserProfileCache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async getProfile(
    teamId: string,
    userId: string
  ): Promise<CachedUserProfile | null> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.userProfile(teamId, userId);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedUserProfile;
  }

  async setProfile(profile: CachedUserProfile): Promise<void> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.userProfile(profile.teamId, profile.userId);
    await client.set(key, JSON.stringify(profile), {
      EX: PROFILE_CACHE_TTL,
    });
  }

  async getEmbeddings(
    teamId: string,
    userId: string
  ): Promise<CachedUserEmbeddings | null> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.userEmbeddings(teamId, userId);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedUserEmbeddings;
  }

  async setEmbeddings(
    teamId: string,
    embeddings: CachedUserEmbeddings
  ): Promise<void> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.userEmbeddings(teamId, embeddings.userId);
    await client.set(key, JSON.stringify(embeddings), {
      EX: EMBEDDING_CACHE_TTL,
    });
  }

  async getTeamDefaults(teamId: string): Promise<TeamDefaults | null> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.teamDefaults(teamId);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as TeamDefaults;
  }

  async setTeamDefaults(defaults: TeamDefaults): Promise<void> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.teamDefaults(defaults.teamId);
    await client.set(key, JSON.stringify(defaults), {
      EX: TEAM_DEFAULTS_TTL,
    });
  }

  async getDepartmentDefaults(
    teamId: string,
    department: string
  ): Promise<TeamDefaults | null> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.departmentDefaults(teamId, department);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as TeamDefaults;
  }

  async setDepartmentDefaults(
    teamId: string,
    department: string,
    defaults: TeamDefaults
  ): Promise<void> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.departmentDefaults(teamId, department);
    await client.set(key, JSON.stringify(defaults), {
      EX: TEAM_DEFAULTS_TTL,
    });
  }

  async invalidateProfile(teamId: string, userId: string): Promise<void> {
    const client = await this.getClient();
    const keys = [
      ProfileCacheKeys.userProfile(teamId, userId),
      ProfileCacheKeys.userEmbeddings(teamId, userId),
      ProfileCacheKeys.userTopics(teamId, userId),
    ];
    await client.del(keys);
  }

  async acquireUpdateLock(
    teamId: string,
    userId: string,
    ttlSeconds = 30
  ): Promise<string | null> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.profileUpdateLock(teamId, userId);
    const token = crypto.randomUUID();
    const acquired = await client.set(key, token, {
      EX: ttlSeconds,
      NX: true,
    });
    return acquired ? token : null;
  }

  async releaseUpdateLock(
    teamId: string,
    userId: string,
    token: string
  ): Promise<boolean> {
    const client = await this.getClient();
    const key = ProfileCacheKeys.profileUpdateLock(teamId, userId);
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await client.eval(script, {
      keys: [key],
      arguments: [token],
    });
    return result === 1;
  }
}

let instance: UserProfileCache | null = null;

export function getUserProfileCache(): UserProfileCache {
  if (!instance) {
    instance = new UserProfileCache();
  }
  return instance;
}
