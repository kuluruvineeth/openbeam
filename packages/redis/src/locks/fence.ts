import { getRedisClient } from "../client";

export class Fence {
  async acquireFence(connectorId: string, ttl = 3600): Promise<number> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
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

  async validateFence(connectorId: string, token: number): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
      const currentToken = await client.get(fenceKey);

      if (!currentToken) {
        return false;
      }

      return Number.parseInt(currentToken, 10) === token;
    } catch (error) {
      console.error("Fence validation error:", error);
      return false;
    }
  }

  async releaseFence(connectorId: string, token: number): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
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

  async extendFence(
    connectorId: string,
    token: number,
    ttl: number
  ): Promise<boolean> {
    const client = await getRedisClient();
    const fenceKey = `fence:${connectorId}`;

    try {
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

export const fence = new Fence();
