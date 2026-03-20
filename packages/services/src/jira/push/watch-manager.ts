import { getRedisClient } from "@openbeam/redis";
import type { AtlassianClient } from "../../atlassian/client";
import { logger } from "../../lib/logger";

const WEBHOOK_TTL_DAYS = 30;
const RENEWAL_BUFFER_DAYS = 7;
const REDIS_KEY_PREFIX = "jira:webhook:";

type JiraWebhookState = {
  webhookId: number;
  connectorId: string;
  expiresAt: number;
  registeredAt: number;
};

type WebhookRegistrationResponse = {
  webhookRegistrationResult: Array<{
    createdWebhookId: number;
  }>;
};

export type JiraWatchManagerConfig = {
  client: AtlassianClient;
  connectorId: string;
  webhookUrl: string;
  verificationToken: string;
};

export class JiraWatchManager {
  private readonly client: AtlassianClient;
  private readonly connectorId: string;
  private readonly webhookUrl: string;

  constructor(config: JiraWatchManagerConfig) {
    this.client = config.client;
    this.connectorId = config.connectorId;
    this.webhookUrl = config.webhookUrl;
  }

  async setup(): Promise<void> {
    const state = await this.getState();
    if (state && !this.isExpiring(state)) {
      return;
    }

    if (state) {
      await this.deleteWebhook(state.webhookId);
    }

    await this.register();
  }

  async renew(): Promise<void> {
    const state = await this.getState();
    if (state) {
      await this.deleteWebhook(state.webhookId);
    }
    await this.register();
  }

  async stop(): Promise<void> {
    const state = await this.getState();
    if (state) {
      await this.deleteWebhook(state.webhookId);
    }
    await this.clearState();
  }

  async needsRenewal(): Promise<boolean> {
    const state = await this.getState();
    if (!state) {
      return true;
    }
    return this.isExpiring(state);
  }

  private async register(): Promise<void> {
    try {
      const result = await this.client.post<WebhookRegistrationResponse>(
        "/rest/api/3/webhook",
        {
          url: this.webhookUrl,
          webhooks: [
            {
              events: ["jira:issue_deleted"],
              jqlFilter: "project is not EMPTY",
            },
          ],
        }
      );

      const created = result.webhookRegistrationResult[0];
      if (!created?.createdWebhookId) {
        throw new Error("Webhook registration returned no ID");
      }

      const now = Date.now();
      const state: JiraWebhookState = {
        webhookId: created.createdWebhookId,
        connectorId: this.connectorId,
        expiresAt: now + WEBHOOK_TTL_DAYS * 86_400_000,
        registeredAt: now,
      };

      await this.saveState(state);

      logger.info(
        { connectorId: this.connectorId, webhookId: state.webhookId },
        "Jira webhook registered"
      );
    } catch (error) {
      logger.error(
        { error, connectorId: this.connectorId },
        "Failed to register Jira webhook"
      );
      throw error;
    }
  }

  private async deleteWebhook(webhookId: number): Promise<void> {
    try {
      await this.client.del(`/rest/api/3/webhook/${webhookId}`);
    } catch (error) {
      logger.warn(
        { error, connectorId: this.connectorId, webhookId },
        "Failed to delete Jira webhook"
      );
    }
  }

  private isExpiring(state: JiraWebhookState): boolean {
    const bufferMs = RENEWAL_BUFFER_DAYS * 86_400_000;
    return Date.now() >= state.expiresAt - bufferMs;
  }

  private async getState(): Promise<JiraWebhookState | null> {
    const redis = await getRedisClient();
    const raw = await redis.get(`${REDIS_KEY_PREFIX}${this.connectorId}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as JiraWebhookState;
  }

  private async saveState(state: JiraWebhookState): Promise<void> {
    const redis = await getRedisClient();
    await redis.set(
      `${REDIS_KEY_PREFIX}${this.connectorId}`,
      JSON.stringify(state),
      "EX",
      WEBHOOK_TTL_DAYS * 86_400
    );
  }

  private async clearState(): Promise<void> {
    const redis = await getRedisClient();
    await redis.del(`${REDIS_KEY_PREFIX}${this.connectorId}`);
  }
}

export async function getExpiringJiraWebhooks(): Promise<string[]> {
  const redis = await getRedisClient();
  const keys = await redis.keys(`${REDIS_KEY_PREFIX}*`);
  const expiring: string[] = [];
  const bufferMs = RENEWAL_BUFFER_DAYS * 86_400_000;

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) {
      continue;
    }
    const state = JSON.parse(raw) as JiraWebhookState;
    if (Date.now() >= state.expiresAt - bufferMs) {
      expiring.push(state.connectorId);
    }
  }

  return expiring;
}
