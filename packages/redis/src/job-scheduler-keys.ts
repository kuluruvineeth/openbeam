import { getRedisClient } from "./client";

export type SyncJobType = "FULL" | "INCREMENTAL" | "PERMISSIONS";

class JobSchedulerKeys {
  private readonly KEY_PREFIX = "sync:scheduler:job:";

  private getKey(connectorId: string, type: SyncJobType): string {
    return `${this.KEY_PREFIX}${connectorId}:${type}`;
  }

  async set(
    connectorId: string,
    type: SyncJobType,
    schedulerId: string
  ): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    await client.set(key, schedulerId);
  }

  async get(connectorId: string, type: SyncJobType): Promise<string | null> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    const value = await client.get(key);
    return value;
  }

  async delete(connectorId: string, type: SyncJobType): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    await client.del(key);
  }

  async deleteAll(connectorId: string): Promise<void> {
    const client = await getRedisClient();
    const fullKey = this.getKey(connectorId, "FULL");
    const incrementalKey = this.getKey(connectorId, "INCREMENTAL");
    const permissionsKey = this.getKey(connectorId, "PERMISSIONS");
    await client.del([fullKey, incrementalKey, permissionsKey]);
  }

  async getAll(connectorId: string): Promise<{
    full: string | null;
    incremental: string | null;
    permissions: string | null;
  }> {
    const [full, incremental, permissions] = await Promise.all([
      this.get(connectorId, "FULL"),
      this.get(connectorId, "INCREMENTAL"),
      this.get(connectorId, "PERMISSIONS"),
    ]);

    return { full, incremental, permissions };
  }

  async exists(connectorId: string, type: SyncJobType): Promise<boolean> {
    const client = await getRedisClient();
    const key = this.getKey(connectorId, type);
    const result = await client.exists(key);
    return result === 1;
  }
}

export const jobSchedulerKeys = new JobSchedulerKeys();
