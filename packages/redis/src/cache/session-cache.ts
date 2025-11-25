/**
 * Session Cache
 *
 * High-performance session management for authentication and real-time presence.
 * Supports session clustering and device tracking.
 */
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

// === Types ===

export interface SessionData {
  sessionId: string;
  userId: string;
  teamId: string;

  // Session type
  type: "web" | "api" | "mobile" | "cli";

  // Device info
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;

  // Security
  mfaVerified: boolean;
  isTrusted: boolean;

  // Timestamps
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;

  // Additional data
  metadata?: Record<string, unknown>;
}

export interface PresenceData {
  userId: string;
  status: "online" | "away" | "dnd" | "offline";
  lastSeenAt: number;
  currentPage?: string;
  deviceType?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// === Session Cache ===

export class SessionCache {
  private client: RedisClientType | null = null;
  private readonly SESSION_PREFIX = "session:";
  private readonly USER_SESSIONS_PREFIX = "user_sessions:";
  private readonly PRESENCE_PREFIX = "presence:";
  private readonly RATE_LIMIT_PREFIX = "rl:session:";
  private readonly DEFAULT_TTL = 86_400; // 24 hours
  private readonly PRESENCE_TTL = 300; // 5 minutes

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  // === Session Management ===

  /**
   * Get session by token
   */
  async getSession(token: string): Promise<SessionData | null> {
    const client = await this.getClient();
    const key = `${this.SESSION_PREFIX}${token}`;

    try {
      const data = await client.get(key);
      if (!data) {
        return null;
      }

      const session = JSON.parse(data) as SessionData;

      // Check if expired
      if (session.expiresAt < Date.now()) {
        await this.deleteSession(token);
        return null;
      }

      return session;
    } catch (error) {
      console.error("Get session error:", error);
      return null;
    }
  }

  /**
   * Create or update a session
   */
  async setSession(token: string, session: SessionData): Promise<void> {
    const client = await this.getClient();
    const key = `${this.SESSION_PREFIX}${token}`;
    const ttl = Math.max(
      1,
      Math.floor((session.expiresAt - Date.now()) / 1000)
    );

    try {
      const multi = client.multi();

      // Store session
      multi.set(key, JSON.stringify(session), { EX: ttl });

      // Add to user's session set
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${session.userId}`;
      multi.sAdd(userSessionsKey, token);
      multi.expire(userSessionsKey, this.DEFAULT_TTL);

      await multi.exec();
    } catch (error) {
      console.error("Set session error:", error);
    }
  }

  /**
   * Update session activity (touch)
   */
  async touchSession(token: string): Promise<boolean> {
    const client = await this.getClient();
    const key = `${this.SESSION_PREFIX}${token}`;

    try {
      const data = await client.get(key);
      if (!data) {
        return false;
      }

      const session = JSON.parse(data) as SessionData;
      session.lastActiveAt = Date.now();

      const ttl = Math.max(
        1,
        Math.floor((session.expiresAt - Date.now()) / 1000)
      );

      await client.set(key, JSON.stringify(session), { EX: ttl });
      return true;
    } catch (error) {
      console.error("Touch session error:", error);
      return false;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(token: string): Promise<boolean> {
    const client = await this.getClient();
    const key = `${this.SESSION_PREFIX}${token}`;

    try {
      // Get session to find user
      const data = await client.get(key);
      if (data) {
        const session = JSON.parse(data) as SessionData;
        // Remove from user's session set
        await client.sRem(
          `${this.USER_SESSIONS_PREFIX}${session.userId}`,
          token
        );
      }

      const deleted = await client.del(key);
      return deleted > 0;
    } catch (error) {
      console.error("Delete session error:", error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const client = await this.getClient();
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;

    try {
      const tokens = await client.sMembers(key);
      if (tokens.length === 0) {
        return [];
      }

      const sessions: SessionData[] = [];
      const invalidTokens: string[] = [];

      for (const token of tokens) {
        const session = await this.getSession(String(token));
        if (session) {
          sessions.push(session);
        } else {
          invalidTokens.push(String(token));
        }
      }

      // Clean up invalid tokens
      if (invalidTokens.length > 0) {
        await client.sRem(key, invalidTokens);
      }

      return sessions;
    } catch (error) {
      console.error("Get user sessions error:", error);
      return [];
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(
    userId: string,
    exceptToken?: string
  ): Promise<number> {
    const client = await this.getClient();
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;

    try {
      const tokens = await client.sMembers(key);
      let count = 0;

      for (const token of tokens) {
        const tokenStr = String(token);
        if (exceptToken && tokenStr === exceptToken) {
          continue;
        }

        await this.deleteSession(tokenStr);
        count += 1;
      }

      return count;
    } catch (error) {
      console.error("Invalidate user sessions error:", error);
      return 0;
    }
  }

  // === Presence ===

  /**
   * Update user presence
   */
  async updatePresence(presence: PresenceData): Promise<void> {
    const client = await this.getClient();
    const key = `${this.PRESENCE_PREFIX}${presence.userId}`;

    try {
      await client.set(key, JSON.stringify(presence), {
        EX: this.PRESENCE_TTL,
      });
    } catch (error) {
      console.error("Update presence error:", error);
    }
  }

  /**
   * Get user presence
   */
  async getPresence(userId: string): Promise<PresenceData | null> {
    const client = await this.getClient();
    const key = `${this.PRESENCE_PREFIX}${userId}`;

    try {
      const data = await client.get(key);
      if (!data) {
        return null;
      }

      return JSON.parse(data) as PresenceData;
    } catch (error) {
      console.error("Get presence error:", error);
      return null;
    }
  }

  /**
   * Get presence for multiple users
   */
  async getPresenceBatch(
    userIds: string[]
  ): Promise<Map<string, PresenceData>> {
    const client = await this.getClient();
    const result = new Map<string, PresenceData>();

    try {
      const keys = userIds.map((id) => `${this.PRESENCE_PREFIX}${id}`);
      const values = await client.mGet(keys);

      for (let i = 0; i < userIds.length; i++) {
        const value = values[i];
        if (value) {
          //TODO: Fix this
          result.set(userIds[i] ?? "", JSON.parse(value) as PresenceData);
        }
      }
    } catch (error) {
      console.error("Get presence batch error:", error);
    }

    return result;
  }

  /**
   * Mark user as offline
   */
  async setOffline(userId: string): Promise<void> {
    await this.updatePresence({
      userId,
      status: "offline",
      lastSeenAt: Date.now(),
    });
  }

  // === Session Rate Limiting ===

  /**
   * Check session creation rate limit
   */
  async checkSessionRateLimit(
    identifier: string, // IP or user ID
    limit = 10,
    windowSeconds = 60
  ): Promise<RateLimitResult> {
    const client = await this.getClient();
    const key = `${this.RATE_LIMIT_PREFIX}${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      const multi = client.multi();

      // Remove old entries
      multi.zRemRangeByScore(key, 0, windowStart);

      // Count current entries
      multi.zCard(key);

      // Add current request
      multi.zAdd(key, { score: now, value: `${now}` });

      // Set expiry
      multi.expire(key, windowSeconds);

      const results = await multi.exec();
      const currentCount =
        typeof results[1] === "number" ? results[1] : Number(results[1]);

      return {
        allowed: currentCount < limit,
        remaining: Math.max(0, limit - currentCount - 1),
        resetAt: now + windowSeconds * 1000,
      };
    } catch (error) {
      console.error("Session rate limit error:", error);
      return { allowed: true, remaining: limit, resetAt: now };
    }
  }

  // === Device Tracking ===

  /**
   * Track device for a user
   */
  async trackDevice(
    userId: string,
    deviceId: string,
    deviceInfo: {
      name?: string;
      type?: string;
      lastIp?: string;
    }
  ): Promise<void> {
    const client = await this.getClient();
    const key = `devices:${userId}`;

    try {
      await client.hSet(
        key,
        deviceId,
        JSON.stringify({
          ...deviceInfo,
          lastSeenAt: Date.now(),
        })
      );
      await client.expire(key, 86_400 * 30); // 30 days
    } catch (error) {
      console.error("Track device error:", error);
    }
  }

  /**
   * Get devices for a user
   */
  async getUserDevices(
    userId: string
  ): Promise<Array<{ deviceId: string; info: Record<string, unknown> }>> {
    const client = await this.getClient();
    const key = `devices:${userId}`;

    try {
      const devices = await client.hGetAll(key);
      return Object.entries(devices).map(([deviceId, info]) => ({
        deviceId,
        info: JSON.parse(info),
      }));
    } catch (error) {
      console.error("Get user devices error:", error);
      return [];
    }
  }
}

// Export singleton
export const sessionCache = new SessionCache();
