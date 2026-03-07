import { randomBytes } from "node:crypto";
import { getRedisClient } from "@openbeam/redis";
import { logger } from "../../lib/logger";
import { getStartPageToken } from "../api/changes";
import {
  calculateWatchRenewalTime,
  isWatchExpiringSoon,
  stopWatch,
  watchChanges,
} from "../api/watch";
import type { GoogleDriveClient } from "../client";

const WATCH_STATE_PREFIX = "google-drive:watch:";
const WATCH_STATE_TTL = 8 * 24 * 60 * 60;
const WATCH_RENEWAL_BUFFER_MS = 60 * 60 * 1000;

export interface DriveWatchState {
  channelId: string;
  resourceId: string;
  expiration: number;
  startPageToken: string;
  connectorId: string;
  webhookUrl: string;
  token?: string;
}

export interface WatchManagerConfig {
  webhookUrl: string;
  token?: string;
}

export class GoogleDriveWatchManager {
  private readonly client: GoogleDriveClient;
  private readonly config: WatchManagerConfig;

  constructor(client: GoogleDriveClient, config: WatchManagerConfig) {
    this.client = client;
    this.config = config;
  }

  async setup(): Promise<DriveWatchState | null> {
    const existingWatch = await this.getWatchState();

    if (existingWatch && !isWatchExpiringSoon(existingWatch.expiration)) {
      return existingWatch;
    }

    return this.createWatch();
  }

  async renew(): Promise<DriveWatchState | null> {
    await this.stop();
    return this.createWatch();
  }

  async stop(): Promise<void> {
    try {
      const state = await this.getWatchState();
      if (state) {
        await stopWatch(this.client, {
          channelId: state.channelId,
          resourceId: state.resourceId,
        });
      }
      await this.clearWatchState();
    } catch (error) {
      logger.warn(
        { connectorId: this.client.connectorId, error },
        "Failed to stop Google Drive watch"
      );
    }
  }

  async getWatchState(): Promise<DriveWatchState | null> {
    const key = this.getStateKey();
    const redis = await getRedisClient();
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as DriveWatchState;
    } catch {
      return null;
    }
  }

  async needsRenewal(): Promise<boolean> {
    const state = await this.getWatchState();
    if (!state) {
      return true;
    }

    return isWatchExpiringSoon(state.expiration, WATCH_RENEWAL_BUFFER_MS);
  }

  async getRenewalTime(): Promise<number | null> {
    const state = await this.getWatchState();
    if (!state) {
      return null;
    }

    return calculateWatchRenewalTime(state.expiration, WATCH_RENEWAL_BUFFER_MS);
  }

  private async createWatch(): Promise<DriveWatchState | null> {
    const startPageToken = await getStartPageToken(this.client);
    const token = this.config.token ?? randomBytes(32).toString("hex");

    const result = await watchChanges(this.client, {
      pageToken: startPageToken,
      webhookUrl: this.config.webhookUrl,
      token,
    });

    const state: DriveWatchState = {
      channelId: result.channelId,
      resourceId: result.resourceId,
      expiration: result.expiration,
      startPageToken,
      connectorId: this.client.connectorId,
      webhookUrl: this.config.webhookUrl,
      token,
    };

    await this.saveWatchState(state);

    logger.info(
      {
        connectorId: this.client.connectorId,
        channelId: state.channelId,
        expiration: new Date(state.expiration).toISOString(),
      },
      "Google Drive watch created"
    );

    return state;
  }

  private async saveWatchState(state: DriveWatchState): Promise<void> {
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
): Promise<DriveWatchState | null> {
  const key = `${WATCH_STATE_PREFIX}${connectorId}`;
  const redis = await getRedisClient();
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as DriveWatchState;
  } catch {
    return null;
  }
}

export async function getAllActiveWatches(): Promise<DriveWatchState[]> {
  const pattern = `${WATCH_STATE_PREFIX}*`;
  const redis = await getRedisClient();
  const keys = await redis.keys(pattern);
  const watches: DriveWatchState[] = [];

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      try {
        watches.push(JSON.parse(data) as DriveWatchState);
      } catch {
        // Skip invalid entries
      }
    }
  }

  return watches;
}

export async function getExpiringWatches(
  bufferMs = WATCH_RENEWAL_BUFFER_MS
): Promise<DriveWatchState[]> {
  const allWatches = await getAllActiveWatches();
  return allWatches.filter((watch) =>
    isWatchExpiringSoon(watch.expiration, bufferMs)
  );
}
