/**
 * Entity Cache
 *
 * Caches entities (users, teams, connectors) for fast lookups.
 * Supports the entity.sd Vespa schema and Prisma models.
 */
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

// === Types ===

export interface CachedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  teamId?: string;
  status: string;
  cachedAt: number;
}

export interface CachedTeam {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  subscriptionTier: string;
  features: string[];
  limits: {
    maxUsers: number;
    maxConnectors: number;
    maxDocuments?: number;
  };
  cachedAt: number;
}

export interface CachedConnector {
  id: string;
  teamId: string;
  name: string;
  app: string;
  status: string;
  lastSyncedAt?: number;
  totalDocuments: number;
  cachedAt: number;
}

// === Entity Cache ===

export class EntityCache {
  private client: RedisClientType | null = null;
  private readonly USER_PREFIX = "entity:user:";
  private readonly TEAM_PREFIX = "entity:team:";
  private readonly CONNECTOR_PREFIX = "entity:connector:";
  private readonly EMAIL_INDEX = "entity:email:";
  private readonly SLUG_INDEX = "entity:slug:";
  private readonly USER_TTL = 300; // 5 minutes
  private readonly TEAM_TTL = 600; // 10 minutes
  private readonly CONNECTOR_TTL = 120; // 2 minutes (changes frequently)

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  // === User Cache ===

  /**
   * Get cached user by ID
   */
  async getUser(userId: string): Promise<CachedUser | null> {
    const client = await this.getClient();
    const key = `${this.USER_PREFIX}${userId}`;

    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as CachedUser;
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  }

  /**
   * Get cached user by email
   */
  async getUserByEmail(email: string): Promise<CachedUser | null> {
    const client = await this.getClient();
    const indexKey = `${this.EMAIL_INDEX}${email.toLowerCase()}`;

    try {
      const userId = await client.get(indexKey);
      if (!userId) return null;
      return await this.getUser(userId);
    } catch (error) {
      console.error("Get user by email error:", error);
      return null;
    }
  }

  /**
   * Cache a user
   */
  async setUser(user: Omit<CachedUser, "cachedAt">): Promise<void> {
    const client = await this.getClient();
    const key = `${this.USER_PREFIX}${user.id}`;
    const emailKey = `${this.EMAIL_INDEX}${user.email.toLowerCase()}`;

    const cacheData: CachedUser = {
      ...user,
      cachedAt: Date.now(),
    };

    try {
      const multi = client.multi();
      multi.set(key, JSON.stringify(cacheData), { EX: this.USER_TTL });
      multi.set(emailKey, user.id, { EX: this.USER_TTL });
      await multi.exec();
    } catch (error) {
      console.error("Set user error:", error);
    }
  }

  /**
   * Batch get users
   */
  async getUsersBatch(userIds: string[]): Promise<Map<string, CachedUser>> {
    const client = await this.getClient();
    const result = new Map<string, CachedUser>();

    try {
      const keys = userIds.map((id) => `${this.USER_PREFIX}${id}`);
      const values = await client.mGet(keys);

      for (let i = 0; i < userIds.length; i++) {
        const value = values[i];
        if (value) {
          result.set(userIds[i]!, JSON.parse(value) as CachedUser);
        }
      }
    } catch (error) {
      console.error("Get users batch error:", error);
    }

    return result;
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string, email?: string): Promise<void> {
    const client = await this.getClient();

    try {
      await client.del(`${this.USER_PREFIX}${userId}`);
      if (email) {
        await client.del(`${this.EMAIL_INDEX}${email.toLowerCase()}`);
      }
    } catch (error) {
      console.error("Invalidate user error:", error);
    }
  }

  // === Team Cache ===

  /**
   * Get cached team by ID
   */
  async getTeam(teamId: string): Promise<CachedTeam | null> {
    const client = await this.getClient();
    const key = `${this.TEAM_PREFIX}${teamId}`;

    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as CachedTeam;
    } catch (error) {
      console.error("Get team error:", error);
      return null;
    }
  }

  /**
   * Get cached team by slug
   */
  async getTeamBySlug(slug: string): Promise<CachedTeam | null> {
    const client = await this.getClient();
    const indexKey = `${this.SLUG_INDEX}${slug.toLowerCase()}`;

    try {
      const teamId = await client.get(indexKey);
      if (!teamId) return null;
      return await this.getTeam(teamId);
    } catch (error) {
      console.error("Get team by slug error:", error);
      return null;
    }
  }

  /**
   * Cache a team
   */
  async setTeam(team: Omit<CachedTeam, "cachedAt">): Promise<void> {
    const client = await this.getClient();
    const key = `${this.TEAM_PREFIX}${team.id}`;
    const slugKey = `${this.SLUG_INDEX}${team.slug.toLowerCase()}`;

    const cacheData: CachedTeam = {
      ...team,
      cachedAt: Date.now(),
    };

    try {
      const multi = client.multi();
      multi.set(key, JSON.stringify(cacheData), { EX: this.TEAM_TTL });
      multi.set(slugKey, team.id, { EX: this.TEAM_TTL });
      await multi.exec();
    } catch (error) {
      console.error("Set team error:", error);
    }
  }

  /**
   * Invalidate team cache
   */
  async invalidateTeam(teamId: string, slug?: string): Promise<void> {
    const client = await this.getClient();

    try {
      await client.del(`${this.TEAM_PREFIX}${teamId}`);
      if (slug) {
        await client.del(`${this.SLUG_INDEX}${slug.toLowerCase()}`);
      }
    } catch (error) {
      console.error("Invalidate team error:", error);
    }
  }

  // === Connector Cache ===

  /**
   * Get cached connector by ID
   */
  async getConnector(connectorId: string): Promise<CachedConnector | null> {
    const client = await this.getClient();
    const key = `${this.CONNECTOR_PREFIX}${connectorId}`;

    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as CachedConnector;
    } catch (error) {
      console.error("Get connector error:", error);
      return null;
    }
  }

  /**
   * Cache a connector
   */
  async setConnector(
    connector: Omit<CachedConnector, "cachedAt">
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.CONNECTOR_PREFIX}${connector.id}`;

    const cacheData: CachedConnector = {
      ...connector,
      cachedAt: Date.now(),
    };

    try {
      await client.set(key, JSON.stringify(cacheData), {
        EX: this.CONNECTOR_TTL,
      });
    } catch (error) {
      console.error("Set connector error:", error);
    }
  }

  /**
   * Get all connectors for a team
   */
  async getTeamConnectors(teamId: string): Promise<CachedConnector[]> {
    const client = await this.getClient();
    const key = `${this.CONNECTOR_PREFIX}team:${teamId}`;

    try {
      const ids = await client.sMembers(key);
      if (ids.length === 0) return [];

      const connectors: CachedConnector[] = [];
      for (const id of ids) {
        const connector = await this.getConnector(String(id));
        if (connector) connectors.push(connector);
      }

      return connectors;
    } catch (error) {
      console.error("Get team connectors error:", error);
      return [];
    }
  }

  /**
   * Cache team connectors index
   */
  async setTeamConnectors(
    teamId: string,
    connectorIds: string[]
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.CONNECTOR_PREFIX}team:${teamId}`;

    try {
      if (connectorIds.length > 0) {
        await client.sAdd(key, connectorIds);
        await client.expire(key, this.CONNECTOR_TTL);
      }
    } catch (error) {
      console.error("Set team connectors error:", error);
    }
  }

  /**
   * Invalidate connector cache
   */
  async invalidateConnector(
    connectorId: string,
    teamId?: string
  ): Promise<void> {
    const client = await this.getClient();

    try {
      await client.del(`${this.CONNECTOR_PREFIX}${connectorId}`);
      if (teamId) {
        await client.sRem(
          `${this.CONNECTOR_PREFIX}team:${teamId}`,
          connectorId
        );
      }
    } catch (error) {
      console.error("Invalidate connector error:", error);
    }
  }

  /**
   * Invalidate all connectors for a team
   */
  async invalidateTeamConnectors(teamId: string): Promise<void> {
    const client = await this.getClient();
    const key = `${this.CONNECTOR_PREFIX}team:${teamId}`;

    try {
      const ids = await client.sMembers(key);
      for (const id of ids) {
        await client.del(`${this.CONNECTOR_PREFIX}${id}`);
      }
      await client.del(key);
    } catch (error) {
      console.error("Invalidate team connectors error:", error);
    }
  }
}

// Export singleton
export const entityCache = new EntityCache();
