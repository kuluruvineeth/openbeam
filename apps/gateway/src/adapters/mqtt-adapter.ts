import type {
  AdapterMetrics,
  ConnectionState,
} from "@openbeam/types/services/connectors/common/industrial";
import type { MqttConnectionConfig } from "@openbeam/types/services/connectors/mqtt";
import logger from "../logger";
import {
  type AdapterConfig,
  createEmptyMetrics,
  type ProtocolAdapter,
  type SubscriptionConfig,
} from "./base-adapter";
import { matchesTopic, safeParsePayload } from "./mqtt-utils";

interface MqttClient {
  on(event: string, handler: (...args: unknown[]) => void): void;
  subscribeAsync(topics: Record<string, { qos: number }>): Promise<unknown>;
  unsubscribeAsync(topics: string[]): Promise<unknown>;
  endAsync(force?: boolean): Promise<void>;
}

export function createMqttAdapter(config: AdapterConfig): ProtocolAdapter {
  let client: MqttClient | null = null;
  let state: ConnectionState = "disconnected";
  const metrics: AdapterMetrics = createEmptyMetrics();
  let connectTime = 0;

  const mqttConfig = config.connection as unknown as MqttConnectionConfig;

  function findMatchingSubscription(
    topic: string,
    subscriptions: SubscriptionConfig[]
  ): SubscriptionConfig | undefined {
    return subscriptions.find((sub) => matchesTopic(sub.topic, topic));
  }

  return {
    protocol: "mqtt",
    connectorId: config.connectorId,

    async connect(): Promise<void> {
      state = "connecting";

      const mqtt = require("mqtt") as {
        connectAsync(
          url: string,
          opts: Record<string, unknown>
        ): Promise<MqttClient>;
      };

      try {
        client = await mqtt.connectAsync(mqttConfig.brokerUrl, {
          port: mqttConfig.port,
          clientId: mqttConfig.clientId,
          username: mqttConfig.username,
          password: mqttConfig.password,
          protocolVersion: mqttConfig.mqttVersion === "5.0" ? 5 : 4,
          clean: mqttConfig.cleanStart,
          keepalive: mqttConfig.keepAlive,
          connectTimeout: mqttConfig.connectTimeout,
          reconnectPeriod: mqttConfig.reconnectPeriod,
          ca: mqttConfig.caFile ? [mqttConfig.caFile] : undefined,
          cert: mqttConfig.certFile,
          key: mqttConfig.keyFile,
          rejectUnauthorized: true,
        });

        state = "connected";
        connectTime = Date.now();
        logger.info(
          { connectorId: config.connectorId, broker: mqttConfig.brokerUrl },
          "MQTT adapter connected"
        );

        client.on("message", (...args: unknown[]) => {
          const topic = args[0] as string;
          const payload = args[1] as Buffer;
          const packet = args[2] as { qos: number; retain: boolean };

          metrics.messagesReceived += 1;
          metrics.lastMessageAt = Date.now();
          metrics.connectionUptime = Date.now() - connectTime;

          const sub = findMatchingSubscription(topic, config.subscriptions);
          if (!sub) {
            metrics.messagesDropped += 1;
            return;
          }

          config.onMessage({
            connectorId: config.connectorId,
            protocol: "mqtt",
            topic,
            payload: safeParsePayload(payload),
            timestamp: Date.now(),
            qos: packet.qos,
            retain: packet.retain,
          });

          metrics.messagesProcessed += 1;
        });

        client.on("error", (...args: unknown[]) => {
          const err = args[0];
          metrics.errorCount += 1;
          state = "error";
          logger.error(
            { err, connectorId: config.connectorId },
            "MQTT adapter error"
          );
        });

        client.on("reconnect", () => {
          metrics.reconnectCount += 1;
          state = "reconnecting";
        });

        client.on("close", () => {
          if (state !== "disconnected") {
            state = "reconnecting";
          }
        });

        if (config.subscriptions.length > 0) {
          await this.subscribe(config.subscriptions);
        }
      } catch (err) {
        state = "error";
        metrics.errorCount += 1;
        throw err;
      }
    },

    async disconnect(): Promise<void> {
      state = "disconnected";
      if (client) {
        await client.endAsync();
        client = null;
      }
    },

    async subscribe(subscriptions: SubscriptionConfig[]): Promise<void> {
      if (!client) {
        throw new Error("MQTT adapter not connected");
      }

      const topics: Record<string, { qos: number }> = {};
      for (const sub of subscriptions) {
        topics[sub.topic] = { qos: sub.qos };
      }

      await client.subscribeAsync(topics);
      logger.info(
        { topics: Object.keys(topics), connectorId: config.connectorId },
        "MQTT subscriptions active"
      );
    },

    async unsubscribe(topics: string[]): Promise<void> {
      if (!client) {
        return;
      }
      await client.unsubscribeAsync(topics);
    },

    getConnectionState(): ConnectionState {
      return state;
    },

    getMetrics(): AdapterMetrics {
      if (state === "connected") {
        metrics.connectionUptime = Date.now() - connectTime;
      }
      return { ...metrics };
    },
  };
}
