import { getRedisClient } from "@openbeam/redis";
import { logger } from "../../lib/logger";
import type { LinearClient } from "../client";

const WEBHOOK_STATE_PREFIX = "linear:webhook:";
const WEBHOOK_STATE_TTL = 30 * 24 * 60 * 60;

export interface WebhookState {
  webhookId: string;
  url: string;
  enabled: boolean;
  resourceTypes: string[];
  createdAt: number;
}

async function getClient() {
  return await getRedisClient();
}

const WEBHOOK_CREATE_MUTATION = `
  mutation WebhookCreate($url: String!, $resourceTypes: [String!]!, $allPublicTeams: Boolean) {
    webhookCreate(input: {
      url: $url
      resourceTypes: $resourceTypes
      allPublicTeams: $allPublicTeams
    }) {
      success
      webhook {
        id
        url
        enabled
        resourceTypes
      }
    }
  }
`;

const WEBHOOK_DELETE_MUTATION = `
  mutation WebhookDelete($id: String!) {
    webhookDelete(id: $id) {
      success
    }
  }
`;

interface WebhookCreateResponse {
  webhookCreate: {
    success: boolean;
    webhook: {
      id: string;
      url: string;
      enabled: boolean;
      resourceTypes: string[];
    };
  };
}

interface WebhookDeleteResponse {
  webhookDelete: {
    success: boolean;
  };
}

export class LinearWatchManager {
  private readonly client: LinearClient;
  private readonly connectorId: string;
  private readonly webhookUrl: string;
  private readonly resourceTypes: string[];

  constructor(config: {
    client: LinearClient;
    connectorId: string;
    webhookUrl: string;
    resourceTypes?: string[];
  }) {
    this.validateWebhookUrl(config.webhookUrl);
    this.client = config.client;
    this.connectorId = config.connectorId;
    this.webhookUrl = config.webhookUrl;
    this.resourceTypes = config.resourceTypes ?? [
      "Issue",
      "Comment",
      "Project",
      "Document",
      "Cycle",
    ];
  }

  private validateWebhookUrl(webhookUrl: string): void {
    const serverUrl = process.env.SERVER_URL;
    if (!serverUrl) {
      throw new Error("SERVER_URL environment variable not configured");
    }

    const allowedHost = new URL(serverUrl).host;
    const webhookHost = new URL(webhookUrl).host;

    if (webhookHost !== allowedHost) {
      throw new Error(
        `Invalid webhook URL: host ${webhookHost} does not match allowed host ${allowedHost}`
      );
    }
  }

  private getStateKey(): string {
    return `${WEBHOOK_STATE_PREFIX}${this.connectorId}`;
  }

  async getState(): Promise<WebhookState | null> {
    const client = await getClient();
    const data = await client.get(this.getStateKey());
    if (!data) {
      return null;
    }
    return JSON.parse(data) as WebhookState;
  }

  private async saveState(state: WebhookState): Promise<void> {
    const client = await getClient();
    await client.set(this.getStateKey(), JSON.stringify(state), {
      EX: WEBHOOK_STATE_TTL,
    });
  }

  private async clearState(): Promise<void> {
    const client = await getClient();
    await client.del(this.getStateKey());
  }

  async setup(): Promise<WebhookState | null> {
    const existingState = await this.getState();
    if (existingState?.enabled) {
      logger.info(
        { webhookId: existingState.webhookId },
        "Linear webhook already exists"
      );
      return existingState;
    }

    try {
      const data = await this.client.mutation<WebhookCreateResponse>(
        WEBHOOK_CREATE_MUTATION,
        {
          url: this.webhookUrl,
          resourceTypes: this.resourceTypes,
          allPublicTeams: true,
        }
      );

      if (!data.webhookCreate.success) {
        logger.error("Failed to create Linear webhook");
        return null;
      }

      const webhook = data.webhookCreate.webhook;
      const state: WebhookState = {
        webhookId: webhook.id,
        url: webhook.url,
        enabled: webhook.enabled,
        resourceTypes: webhook.resourceTypes,
        createdAt: Date.now(),
      };

      await this.saveState(state);
      logger.info({ webhookId: state.webhookId }, "Linear webhook created");

      return state;
    } catch (error) {
      logger.error({ error }, "Error creating Linear webhook");
      return null;
    }
  }

  async stop(): Promise<void> {
    const state = await this.getState();
    if (!state) {
      logger.info("No Linear webhook to delete");
      return;
    }

    try {
      const data = await this.client.mutation<WebhookDeleteResponse>(
        WEBHOOK_DELETE_MUTATION,
        { id: state.webhookId }
      );

      if (data.webhookDelete.success) {
        logger.info({ webhookId: state.webhookId }, "Linear webhook deleted");
      }
    } catch (error) {
      logger.error({ error }, "Error deleting Linear webhook");
    } finally {
      await this.clearState();
    }
  }
}

export function createWatchManager(config: {
  client: LinearClient;
  connectorId: string;
  webhookUrl: string;
  resourceTypes?: string[];
}): LinearWatchManager {
  return new LinearWatchManager(config);
}
