import { getRedisClient } from "./client";

/**
 * Redis-based storage for BullMQ repeatable job scheduler keys
 * Stores job scheduler keys in Redis for multi-worker deployments.
 */
class JobSchedulerKeys {
  private readonly KEY_PREFIX = "sync:scheduler:job:";

  /**
   * Get the Redis key for a job scheduler
   */
  private getKey(connectorId: string, type: "FULL" | "INCREMENTAL"): string {
    return `${this.KEY_PREFIX}${connectorId}:${type}`;
  }

  /**
   * Store a job scheduler key
   */
  async set(
    connectorId: string,
    type: "FULL" | "INCREMENTAL",
    schedulerId: string
  ): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    await client.set(key, schedulerId);
  }

  /**
   * Get a job scheduler key
   */
  async get(
    connectorId: string,
    type: "FULL" | "INCREMENTAL"
  ): Promise<string | null> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    const value = await client.get(key);
    return value;
  }

  /**
   * Delete a job scheduler key
   */
  async delete(
    connectorId: string,
    type: "FULL" | "INCREMENTAL"
  ): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    await client.del(key);
  }

  /**
   * Delete all job scheduler keys for a connector
   */
  async deleteAll(connectorId: string): Promise<void> {
    const client = await getRedisClient();
    const fullKey = this.getKey(connectorId, "FULL");
    const incrementalKey = this.getKey(connectorId, "INCREMENTAL");
    await client.del([fullKey, incrementalKey]);
  }

  /**
   * Get all job scheduler keys for a connector
   */
  async getAll(connectorId: string): Promise<{
    full: string | null;
    incremental: string | null;
  }> {
    const [full, incremental] = await Promise.all([
      this.get(connectorId, "FULL"),
      this.get(connectorId, "INCREMENTAL"),
    ]);

    return { full, incremental };
  }

  /**
   * Check if a job scheduler key exists
   */
  async exists(
    connectorId: string,
    type: "FULL" | "INCREMENTAL"
  ): Promise<boolean> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    const result = await client.exists(key);
    return result === 1;
  }
}

// Export singleton instance
export const jobSchedulerKeys = new JobSchedulerKeys();
