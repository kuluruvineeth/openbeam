import { getRedisClient } from "./client";

export class EventDeduplicator {
  async isProcessed(eventId: string, source: string): Promise<boolean> {
    const client = await getRedisClient();
    const key = `webhook:processed:${source}:${eventId}`;
    const exists = await client.exists(key);
    return exists === 1;
  }

  async markProcessed(
    eventId: string,
    source: string,
    ttlSeconds = 86_400
  ): Promise<boolean> {
    const client = await getRedisClient();
    const key = `webhook:processed:${source}:${eventId}`;
    const result = await client.set(key, Date.now().toString(), {
      EX: ttlSeconds,
      NX: true,
    });
    return result === "OK";
  }

  async checkAndMark(
    eventId: string,
    source: string,
    ttlSeconds = 86_400
  ): Promise<{ isDuplicate: boolean; marked: boolean }> {
    const client = await getRedisClient();
    const key = `webhook:processed:${source}:${eventId}`;

    const result = await client.set(key, Date.now().toString(), {
      EX: ttlSeconds,
      NX: true,
    });

    return {
      isDuplicate: result !== "OK",
      marked: result === "OK",
    };
  }

  async unmark(eventId: string, source: string): Promise<boolean> {
    const client = await getRedisClient();
    const key = `webhook:processed:${source}:${eventId}`;
    const deleted = await client.del(key);
    return deleted > 0;
  }

  async getProcessedCount(source: string): Promise<number> {
    const client = await getRedisClient();
    const pattern = `webhook:processed:${source}:*`;
    const keys = await client.keys(pattern);
    return keys.length;
  }
}

export const eventDeduplicator = new EventDeduplicator();
