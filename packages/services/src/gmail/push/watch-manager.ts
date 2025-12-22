import { randomBytes } from "node:crypto";
import { getRedisClient } from "@openplane/redis";
import { logger } from "../../lib/logger";
import {
  getWatchRenewalTime,
  isWatchExpiringSoon,
  parseWatchExpiration,
  setupWatch,
  stopWatch,
  WATCH_RENEWAL_BUFFER_HOURS,
  type WatchState,
} from "../api/watch";
import type { GmailClient } from "../client";

const WATCH_STATE_PREFIX = "gmail:watch:";
const WATCH_STATE_TTL = 8 * 24 * 60 * 60;

export interface WatchManagerConfig {
  topicName: string;
  labelIds?: string[];
}

export class GmailWatchManager {
  private readonly client: GmailClient;
  private readonly config: WatchManagerConfig;

  constructor(client: GmailClient, config: WatchManagerConfig) {
    this.client = client;
    this.config = config;
  }

  async setup(): Promise<WatchState | null> {
    const existingWatch = await this.getWatchState();

    if (
      existingWatch &&
      !isWatchExpiringSoon(existingWatch.expiration, WATCH_RENEWAL_BUFFER_HOURS)
    ) {
      return existingWatch;
    }

    return this.createWatch();
  }

  async renew(): Promise<WatchState | null> {
    await this.stop();
    return this.createWatch();
  }

  async stop(): Promise<void> {
    try {
      await stopWatch(this.client);
      await this.clearWatchState();
    } catch (error) {
      logger.warn(
        { connectorId: this.client.connectorId, error },
        "Failed to stop Gmail watch"
      );
    }
  }

  async getWatchState(): Promise<WatchState | null> {
    const key = this.getStateKey();
    const redis = await getRedisClient();
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as WatchState;
    } catch {
      return null;
    }
  }

  async needsRenewal(): Promise<boolean> {
    const state = await this.getWatchState();
    if (!state) {
      return true;
    }

    return isWatchExpiringSoon(state.expiration, WATCH_RENEWAL_BUFFER_HOURS);
  }

  async getRenewalTime(): Promise<number | null> {
    const state = await this.getWatchState();
    if (!state) {
      return null;
    }

    return getWatchRenewalTime(state.expiration);
  }

  private async createWatch(): Promise<WatchState | null> {
    const response = await setupWatch(this.client, {
      topicName: this.config.topicName,
      labelIds: this.config.labelIds,
      labelFilterBehavior: "include",
    });

    if (!response) {
      return null;
    }

    const state: WatchState = {
      historyId: response.historyId,
      expiration: parseWatchExpiration(response.expiration),
      topicName: this.config.topicName,
      connectorId: this.client.connectorId,
      token: randomBytes(32).toString("hex"),
    };

    await this.saveWatchState(state);

    logger.info(
      {
        connectorId: this.client.connectorId,
        historyId: state.historyId,
        expiration: new Date(state.expiration).toISOString(),
      },
      "Gmail watch created"
    );

    return state;
  }

  private async saveWatchState(state: WatchState): Promise<void> {
    const key = this.getStateKey();
    const redis = await getRedisClient();
    await redis.set(key, JSON.stringify(state), { EX: WATCH_STATE_TTL });
  }

  private async clearWatchState(): Promise<void> {
    const key = this.getStateKey();
    const redis = await getRedisClient();
    await redis.del(key);
  }

  private getStateKey(): string {
    return `${WATCH_STATE_PREFIX}${this.client.connectorId}`;
  }
}

export async function getWatchStateForConnector(
  connectorId: string
): Promise<WatchState | null> {
  const key = `${WATCH_STATE_PREFIX}${connectorId}`;
  const redis = await getRedisClient();
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as WatchState;
  } catch {
    return null;
  }
}

export async function getAllActiveWatches(): Promise<WatchState[]> {
  const pattern = `${WATCH_STATE_PREFIX}*`;
  const redis = await getRedisClient();
  const keys = await redis.keys(pattern);
  const watches: WatchState[] = [];

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      try {
        watches.push(JSON.parse(data) as WatchState);
      } catch {
        // Ignore invalid JSON
      }
    }
  }

  return watches;
}

export async function getExpiringWatches(
  bufferHours = 24
): Promise<WatchState[]> {
  const allWatches = await getAllActiveWatches();
  return allWatches.filter((watch) =>
    isWatchExpiringSoon(watch.expiration, bufferHours)
  );
}
