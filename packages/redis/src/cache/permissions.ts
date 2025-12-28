import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";
import {
  GROUP_CACHE_TTL,
  PERMISSION_CACHE_TTL,
  PermissionCacheKeys,
} from "./permission-keys";

export interface CachedPermissionSet {
  userId: string;
  email: string | null;
  teamId: string;
  groupIds: string[];
  domain: string | null;
  connectorScopes: Record<string, string[]>;
  isTeamAdmin: boolean;
  cachedAt: number;
}

export class PermissionCache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async getUserPermissionSet(
    teamId: string,
    userId: string
  ): Promise<CachedPermissionSet | null> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.userPermissionSet(teamId, userId);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedPermissionSet;
  }

  async setUserPermissionSet(
    teamId: string,
    userId: string,
    permissionSet: CachedPermissionSet
  ): Promise<void> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.userPermissionSet(teamId, userId);
    await client.set(key, JSON.stringify(permissionSet), {
      EX: PERMISSION_CACHE_TTL,
    });
  }

  async invalidateUser(teamId: string, userId: string): Promise<void> {
    const client = await this.getClient();
    const keys = [
      PermissionCacheKeys.userPermissionSet(teamId, userId),
      PermissionCacheKeys.userGroups(teamId, userId),
      PermissionCacheKeys.userConnectorScopes(teamId, userId),
    ];
    await client.del(keys);
  }

  async invalidateGroup(teamId: string, groupId: string): Promise<void> {
    const client = await this.getClient();
    const memberKey = PermissionCacheKeys.groupMembers(teamId, groupId);
    const memberIds = await client.sMembers(memberKey);

    const keysToDelete = [memberKey];

    for (const memberId of memberIds) {
      keysToDelete.push(
        PermissionCacheKeys.userPermissionSet(teamId, memberId)
      );
      keysToDelete.push(PermissionCacheKeys.userGroups(teamId, memberId));
    }

    if (keysToDelete.length > 0) {
      await client.del(keysToDelete);
    }
  }

  async invalidateDocument(teamId: string, documentId: string): Promise<void> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.documentPermissions(teamId, documentId);
    await client.del(key);
  }

  async invalidateConnector(
    teamId: string,
    connectorId: string
  ): Promise<void> {
    const client = await this.getClient();
    const connectorUsersKey = PermissionCacheKeys.connectorUsers(
      teamId,
      connectorId
    );
    const userIds = await client.sMembers(connectorUsersKey);

    const keysToDelete = [connectorUsersKey];

    for (const userId of userIds) {
      keysToDelete.push(PermissionCacheKeys.userPermissionSet(teamId, userId));
      keysToDelete.push(
        PermissionCacheKeys.userConnectorScopes(teamId, userId)
      );
    }

    if (keysToDelete.length > 0) {
      await client.del(keysToDelete);
    }
  }

  async trackConnectorUser(
    teamId: string,
    connectorId: string,
    userId: string
  ): Promise<void> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.connectorUsers(teamId, connectorId);
    await client.sAdd(key, userId);
    await client.expire(key, GROUP_CACHE_TTL);
  }

  async getUserGroups(
    teamId: string,
    userId: string
  ): Promise<string[] | null> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.userGroups(teamId, userId);
    const data = await client.sMembers(key);
    if (data.length === 0) {
      return null;
    }
    return data;
  }

  async setUserGroups(
    teamId: string,
    userId: string,
    groupIds: string[]
  ): Promise<void> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.userGroups(teamId, userId);
    const multi = client.multi();
    multi.del(key);
    if (groupIds.length > 0) {
      multi.sAdd(key, groupIds);
    }
    multi.expire(key, GROUP_CACHE_TTL);
    await multi.exec();
  }

  async trackGroupMember(
    teamId: string,
    groupId: string,
    userId: string
  ): Promise<void> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.groupMembers(teamId, groupId);
    await client.sAdd(key, userId);
    await client.expire(key, GROUP_CACHE_TTL);
  }

  async acquireSyncLock(
    connectorId: string,
    ttlSeconds = 600
  ): Promise<string | null> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.connectorSyncLock(connectorId);
    const token = crypto.randomUUID();
    const acquired = await client.set(key, token, {
      EX: ttlSeconds,
      NX: true,
    });
    return acquired ? token : null;
  }

  async releaseSyncLock(connectorId: string, token: string): Promise<boolean> {
    const client = await this.getClient();
    const key = PermissionCacheKeys.connectorSyncLock(connectorId);
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

let instance: PermissionCache | null = null;

export function getPermissionCache(): PermissionCache {
  if (!instance) {
    instance = new PermissionCache();
  }
  return instance;
}
