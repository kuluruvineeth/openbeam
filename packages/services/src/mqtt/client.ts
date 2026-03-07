import type {
  MqttConnectionConfig,
  MqttSubscription,
} from "@openbeam/types/services/connectors/mqtt";
import { logger } from "../lib/logger";
import { MqttConnectorError } from "./types";

const DEFAULT_TIMEOUT = 30_000;

interface MqttClientHandle {
  on(event: string, handler: (...args: unknown[]) => void): void;
  subscribeAsync(topics: Record<string, { qos: number }>): Promise<unknown>;
  unsubscribeAsync(topics: string[]): Promise<unknown>;
  endAsync(force?: boolean): Promise<void>;
}

export interface MqttConnectorClient {
  readonly connectorId: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(subscriptions: MqttSubscription[]): Promise<void>;
  unsubscribe(topics: string[]): Promise<void>;
  healthCheck(): Promise<boolean>;
}

interface MqttConnectorClientConfig {
  connection: MqttConnectionConfig;
  onMessage?: (topic: string, payload: Buffer) => void;
}

export function createMqttConnectorClient(
  config: MqttConnectorClientConfig
): MqttConnectorClient {
  const { connection } = config;
  let client: MqttClientHandle | null = null;

  return {
    connectorId: connection.connectorId,

    async connect(): Promise<void> {
      const mqtt = require("mqtt") as {
        connectAsync(
          url: string,
          opts: Record<string, unknown>
        ): Promise<MqttClientHandle>;
      };

      try {
        client = await mqtt.connectAsync(connection.brokerUrl, {
          port: connection.port,
          clientId: connection.clientId,
          username: connection.username,
          password: connection.password,
          protocolVersion: connection.mqttVersion === "5.0" ? 5 : 4,
          clean: connection.cleanStart,
          keepalive: connection.keepAlive,
          connectTimeout: connection.connectTimeout ?? DEFAULT_TIMEOUT,
          reconnectPeriod: connection.reconnectPeriod,
          ca: connection.caFile ? [connection.caFile] : undefined,
          cert: connection.certFile,
          key: connection.keyFile,
          rejectUnauthorized: true,
        });

        if (config.onMessage) {
          const handler = config.onMessage;
          client.on("message", (...args: unknown[]) => {
            handler(args[0] as string, args[1] as Buffer);
          });
        }

        logger.info(
          { connectorId: connection.connectorId, broker: connection.brokerUrl },
          "MQTT connector client connected"
        );
      } catch (err) {
        throw new MqttConnectorError({
          message: `Failed to connect to MQTT broker: ${err instanceof Error ? err.message : String(err)}`,
          code: "CONNECTION_FAILED",
          retryable: true,
        });
      }
    },

    async disconnect(): Promise<void> {
      if (client) {
        await client.endAsync();
        client = null;
      }
    },

    async subscribe(subscriptions: MqttSubscription[]): Promise<void> {
      if (!client) {
        throw new MqttConnectorError({
          message: "MQTT client not connected",
          code: "NOT_CONNECTED",
          retryable: false,
        });
      }

      const topics: Record<string, { qos: number }> = {};
      for (const sub of subscriptions) {
        topics[sub.topic] = { qos: sub.qos };
      }

      await client.subscribeAsync(topics);

      logger.info(
        {
          connectorId: connection.connectorId,
          topicCount: subscriptions.length,
        },
        "MQTT subscriptions active"
      );
    },

    async unsubscribe(topics: string[]): Promise<void> {
      if (!client) {
        return;
      }
      await client.unsubscribeAsync(topics);
    },

    healthCheck(): Promise<boolean> {
      return Promise.resolve(client !== null);
    },
  };
}
