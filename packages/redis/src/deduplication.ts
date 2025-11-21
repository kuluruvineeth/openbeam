/**
 * Event Deduplication
 * 
 * Prevents duplicate webhook processing using Redis sets.
 * Events are stored with TTL for automatic cleanup.
 */

import { getRedisClient } from "./client";
import type { RedisClientType } from "redis";

export class EventDeduplicator {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  /**
   * Check if event was already processed
   */
  async isProcessed(eventId: string, source: string): Promise<boolean> {
    const client = await this.getClient();
    const key = `webhook:processed:${source}:${eventId}`;
    const exists = await client.exists(key);
    return exists === 1;
  }

  /**
   * Mark event as processed with TTL (24 hours default)
   */
  async markProcessed(
    eventId: string,
    source: string,
    ttlSeconds: number = 86400
  ): Promise<boolean> {
    const client = await this.getClient();
    const key = `webhook:processed:${source}:${eventId}`;
    const result = await client.set(key, Date.now().toString(), {
      EX: ttlSeconds,
      NX: true, // Only set if doesn't exist
    });
    return result === "OK";
  }

  /**
   * Check and mark in one operation (atomic)
   */
  async checkAndMark(
    eventId: string,
    source: string,
    ttlSeconds: number = 86400
  ): Promise<{ isDuplicate: boolean; marked: boolean }> {
    const client = await this.getClient();
    const key = `webhook:processed:${source}:${eventId}`;

    // Try to set with NX (only if not exists)
    const result = await client.set(key, Date.now().toString(), {
      EX: ttlSeconds,
      NX: true,
    });

    return {
      isDuplicate: result !== "OK",
      marked: result === "OK",
    };
  }

  /**
   * Remove event from processed set (for replay)
   */
  async unmark(eventId: string, source: string): Promise<boolean> {
    const client = await this.getClient();
    const key = `webhook:processed:${source}:${eventId}`;
    const deleted = await client.del(key);
    return deleted > 0;
  }

  /**
   * Get count of processed events for a source
   */
  async getProcessedCount(source: string): Promise<number> {
    const client = await this.getClient();
    const pattern = `webhook:processed:${source}:*`;
    const keys = await client.keys(pattern);
    return keys.length;
  }
}

export const eventDeduplicator = new EventDeduplicator();

