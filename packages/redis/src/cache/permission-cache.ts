/**
 * Permission Cache
 *
 * Caches computed permissions for fast authorization checks.
 * Supports permission inheritance and group membership.
 */
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

// === Types ===

export type ResourceType =
  | "document"
  | "connector"
  | "project"
  | "folder"
  | "channel"
  | "assistant"
  | "tool"
  | "team"
  | "workspace";

export interface EffectivePermissions {
  permissions: string[]; // ["read", "write", "delete", "share", "admin"]
  inheritedFrom?: string; // Resource ID permissions were inherited from
  computedAt: number;
  expiresAt: number;
  version: number;
}

export interface UserGroups {
  groupIds: string[];
  cachedAt: number;
}

// === Permission Cache ===

export class PermissionCache {
  private client: RedisClientType | null = null;
  private readonly PREFIX = "perm:";
  private readonly GROUP_PREFIX = "groups:";
  private readonly DOCUMENT_ACL_PREFIX = "acl:";
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly GROUP_TTL = 600; // 10 minutes
  private readonly ACL_TTL = 60; // 1 minute (documents change frequently)

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  // === Effective Permissions ===

  /**
   * Get cached effective permissions for a user on a resource
   */
  async getPermissions(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<EffectivePermissions | null> {
    const client = await this.getClient();
    const key = `${this.PREFIX}${userId}:${resourceType}:${resourceId}`;

    try {
      const data = await client.get(key);
      if (!data) return null;

      const perms = JSON.parse(data) as EffectivePermissions;

      // Check if expired
      if (perms.expiresAt < Date.now()) {
        await client.del(key);
        return null;
      }

      return perms;
    } catch (error) {
      console.error("Permission cache get error:", error);
      return null;
    }
  }

  /**
   * Cache effective permissions
   */
  async setPermissions(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissions: string[],
    options?: {
      inheritedFrom?: string;
      ttl?: number;
      version?: number;
    }
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.PREFIX}${userId}:${resourceType}:${resourceId}`;
    const ttl = options?.ttl ?? this.DEFAULT_TTL;

    const cacheData: EffectivePermissions = {
      permissions,
      inheritedFrom: options?.inheritedFrom,
      computedAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      version: options?.version ?? 1,
    };

    try {
      await client.set(key, JSON.stringify(cacheData), { EX: ttl });
    } catch (error) {
      console.error("Permission cache set error:", error);
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permission: string
  ): Promise<boolean | null> {
    const perms = await this.getPermissions(userId, resourceType, resourceId);
    if (!perms) return null; // Cache miss

    return (
      perms.permissions.includes(permission) ||
      perms.permissions.includes("admin")
    );
  }

  /**
   * Invalidate all permissions for a user
   */
  async invalidateUser(userId: string): Promise<number> {
    const client = await this.getClient();
    const pattern = `${this.PREFIX}${userId}:*`;

    try {
      let count = 0;
      const iterator = client.scanIterator({ MATCH: pattern, COUNT: 100 });

      for await (const key of iterator) {
        await client.del(String(key));
        count++;
      }

      // Also invalidate group membership
      await client.del(`${this.GROUP_PREFIX}${userId}`);

      return count;
    } catch (error) {
      console.error("Permission cache invalidate user error:", error);
      return 0;
    }
  }

  /**
   * Invalidate all permissions for a resource
   */
  async invalidateResource(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<number> {
    const client = await this.getClient();
    const pattern = `${this.PREFIX}*:${resourceType}:${resourceId}`;

    try {
      let count = 0;
      const iterator = client.scanIterator({ MATCH: pattern, COUNT: 100 });

      for await (const key of iterator) {
        await client.del(String(key));
        count++;
      }

      return count;
    } catch (error) {
      console.error("Permission cache invalidate resource error:", error);
      return 0;
    }
  }

  // === Group Membership ===

  /**
   * Get cached group membership for a user
   */
  async getUserGroups(userId: string): Promise<string[] | null> {
    const client = await this.getClient();
    const key = `${this.GROUP_PREFIX}${userId}`;

    try {
      const data = await client.get(key);
      if (!data) return null;

      const groups = JSON.parse(data) as UserGroups;
      return groups.groupIds;
    } catch (error) {
      console.error("Get user groups error:", error);
      return null;
    }
  }

  /**
   * Cache group membership
   */
  async setUserGroups(
    userId: string,
    groupIds: string[],
    ttl: number = this.GROUP_TTL
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.GROUP_PREFIX}${userId}`;

    const cacheData: UserGroups = {
      groupIds,
      cachedAt: Date.now(),
    };

    try {
      await client.set(key, JSON.stringify(cacheData), { EX: ttl });
    } catch (error) {
      console.error("Set user groups error:", error);
    }
  }

  /**
   * Invalidate group membership
   */
  async invalidateUserGroups(userId: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`${this.GROUP_PREFIX}${userId}`);
  }

  // === Document ACL (for search filtering) ===

  /**
   * Get cached ACL for a document
   */
  async getDocumentACL(documentId: string): Promise<string[] | null> {
    const client = await this.getClient();
    const key = `${this.DOCUMENT_ACL_PREFIX}${documentId}`;

    try {
      const members = await client.sMembers(key);
      if (members.length === 0) return null;
      return members.map(String);
    } catch (error) {
      console.error("Get document ACL error:", error);
      return null;
    }
  }

  /**
   * Cache document ACL
   */
  async setDocumentACL(
    documentId: string,
    userIds: string[],
    ttl: number = this.ACL_TTL
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.DOCUMENT_ACL_PREFIX}${documentId}`;

    try {
      if (userIds.length > 0) {
        await client.sAdd(key, userIds);
        await client.expire(key, ttl);
      }
    } catch (error) {
      console.error("Set document ACL error:", error);
    }
  }

  /**
   * Batch cache document ACLs
   */
  async setDocumentACLsBatch(
    acls: Array<{ documentId: string; userIds: string[] }>,
    ttl: number = this.ACL_TTL
  ): Promise<void> {
    const client = await this.getClient();

    try {
      const multi = client.multi();

      for (const { documentId, userIds } of acls) {
        if (userIds.length > 0) {
          const key = `${this.DOCUMENT_ACL_PREFIX}${documentId}`;
          multi.sAdd(key, userIds);
          multi.expire(key, ttl);
        }
      }

      await multi.exec();
    } catch (error) {
      console.error("Set document ACLs batch error:", error);
    }
  }

  /**
   * Check if user has access to document
   */
  async checkDocumentAccess(
    documentId: string,
    userId: string,
    userGroups?: string[]
  ): Promise<boolean | null> {
    const client = await this.getClient();
    const key = `${this.DOCUMENT_ACL_PREFIX}${documentId}`;

    try {
      // Check user directly
      const hasAccess = await client.sIsMember(key, userId);
      if (hasAccess) return true;

      // Check groups
      if (userGroups && userGroups.length > 0) {
        for (const groupId of userGroups) {
          const groupHasAccess = await client.sIsMember(
            key,
            `group:${groupId}`
          );
          if (groupHasAccess) return true;
        }
      }

      // Check if key exists (if not, cache miss)
      const exists = await client.exists(key);
      if (!exists) return null; // Cache miss

      return false;
    } catch (error) {
      console.error("Check document access error:", error);
      return null;
    }
  }

  /**
   * Invalidate document ACL
   */
  async invalidateDocumentACL(documentId: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`${this.DOCUMENT_ACL_PREFIX}${documentId}`);
  }

  /**
   * Batch invalidate document ACLs
   */
  async invalidateDocumentACLsBatch(documentIds: string[]): Promise<void> {
    const client = await this.getClient();
    const keys = documentIds.map((id) => `${this.DOCUMENT_ACL_PREFIX}${id}`);

    try {
      for (const key of keys) {
        await client.del(key);
      }
    } catch (error) {
      console.error("Invalidate document ACLs batch error:", error);
    }
  }
}

// Export singleton
export const permissionCache = new PermissionCache();
