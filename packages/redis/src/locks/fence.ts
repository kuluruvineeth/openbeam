import { getRedisClient } from "../client";

/**
 * Fencing Protocol for Exactly-Once Execution
 *
 * Ensures that only one worker processes a sync job at a time, even in distributed environments.
 * Uses monotonically increasing tokens to detect and reject stale executions.
 *
 * @example
 * ```typescript
 * const fence = new Fence();
 * const token = await fence.acquireFence('connector-123');
 *
 * try {
 *   // Check fence is still valid before critical operations
 *   if (!await fence.validateFence('connector-123', token)) {
 *     throw new Error('Fence token invalid - another worker processing');
 *   }
 *
 *   // Process sync...
 * } finally {
 *   await fence.releaseFence('connector-123', token);
 * }
 * ```
 */
export class Fence {
  /**
   * Acquire a fence token for a connector
   *
   * Uses Lua script to atomically INCR and EXPIRE in a single operation
   *
   * @param connectorId - Unique connector identifier
   * @param ttl - Time-to-live in seconds (default: 3600 = 1 hour)
   * @returns Monotonically increasing fence token
   */
  async acquireFence(connectorId: string, ttl = 3600): Promise<number> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      // Atomic INCR + EXPIRE using Lua script
      const script = `
        local token = redis.call("incr", KEYS[1])
        redis.call("expire", KEYS[1], ARGV[1])
        return token
      `;

      const token = await client.eval(script, {
        keys: [fenceKey],
        arguments: [ttl.toString()],
      });

      return Number(token);
    } catch (error) {
      console.error("Fence acquisition error:", error);
      throw new Error(
        `Failed to acquire fence for connector ${connectorId}: ${error}`
      );
    }
  }

  /**
   * Validate that a fence token is still current
   *
   * @param connectorId - Unique connector identifier
   * @param token - Token to validate
   * @returns true if token is current, false if stale or fence doesn't exist
   */
  async validateFence(connectorId: string, token: number): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      const currentToken = await client.get(fenceKey);

      // Fence doesn't exist or has expired
      if (!currentToken) {
        return false;
      }

      // Token matches - fence is valid
      return Number.parseInt(currentToken, 10) === token;
    } catch (error) {
      console.error("Fence validation error:", error);
      return false;
    }
  }

  /**
   * Release a fence token
   * Only releases if the provided token matches the current token
   *
   * @param connectorId - Unique connector identifier
   * @param token - Token to release
   * @returns true if released successfully, false otherwise
   */
  async releaseFence(connectorId: string, token: number): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      // Lua script to atomically check token and delete
      const script = `
        local currentToken = redis.call("get", KEYS[1])
        if currentToken and tonumber(currentToken) == tonumber(ARGV[1]) then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await client.eval(script, {
        keys: [fenceKey],
        arguments: [token.toString()],
      });

      return result === 1;
    } catch (error) {
      console.error("Fence release error:", error);
      return false;
    }
  }

  /**
   * Check if a fence exists for a connector
   *
   * @param connectorId - Unique connector identifier
   * @returns true if fence exists, false otherwise
   */
  async isFenced(connectorId: string): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      const exists = await client.exists(fenceKey);
      return exists === 1;
    } catch (error) {
      console.error("Fence check error:", error);
      return false;
    }
  }

  /**
   * Get the current fence token for a connector
   *
   * @param connectorId - Unique connector identifier
   * @returns Current token or null if no fence exists
   */
  async getCurrentToken(connectorId: string): Promise<number | null> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      const token = await client.get(fenceKey);
      return token ? Number.parseInt(token, 10) : null;
    } catch (error) {
      console.error("Get current token error:", error);
      return null;
    }
  }

  /**
   * Force release a fence (use with caution)
   * Should only be used for cleanup or debugging
   *
   * @param connectorId - Unique connector identifier
   * @returns true if deleted, false otherwise
   */
  async forceRelease(connectorId: string): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      const result = await client.del(fenceKey);
      return result === 1;
    } catch (error) {
      console.error("Force release error:", error);
      return false;
    }
  }

  /**
   * Extend the TTL of an existing fence
   * Useful for long-running operations
   *
   * @param connectorId - Unique connector identifier
   * @param token - Current token
   * @param ttl - New TTL in seconds
   * @returns true if extended, false if token mismatch or fence doesn't exist
   */
  async extendFence(
    connectorId: string,
    token: number,
    ttl: number
  ): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      // Lua script to atomically check token and extend TTL
      const script = `
        local currentToken = redis.call("get", KEYS[1])
        if currentToken and tonumber(currentToken) == tonumber(ARGV[1]) then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await client.eval(script, {
        keys: [fenceKey],
        arguments: [token.toString(), ttl.toString()],
      });

      return result === 1;
    } catch (error) {
      console.error("Fence extend error:", error);
      return false;
    }
  }
}

// Export singleton instance
export const fence = new Fence();
