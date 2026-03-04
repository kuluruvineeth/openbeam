import type { BacnetConnectionConfig } from "@openplane/types/services/connectors/bacnet";
import type {
  AdapterMetrics,
  ConnectionState,
} from "@openplane/types/services/connectors/common/industrial";
import logger from "../logger";
import {
  type AdapterConfig,
  createEmptyMetrics,
  type ProtocolAdapter,
  type SubscriptionConfig,
} from "./base-adapter";

export function createBacnetAdapter(config: AdapterConfig): ProtocolAdapter {
  let state: ConnectionState = "disconnected";
  const metrics: AdapterMetrics = createEmptyMetrics();
  let connectTime = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const bacnetConfig = config.connection as unknown as BacnetConnectionConfig;

  return {
    protocol: "bacnet",
    connectorId: config.connectorId,

    async connect(): Promise<void> {
      state = "connecting";

      try {
        state = "connected";
        connectTime = Date.now();

        logger.info(
          {
            connectorId: config.connectorId,
            interface: bacnetConfig.interface,
            port: bacnetConfig.port,
          },
          "BACnet adapter connected"
        );

        if (config.subscriptions.length > 0) {
          await this.subscribe(config.subscriptions);
        }
      } catch (err) {
        state = "error";
        metrics.errorCount += 1;
        throw err;
      }
    },

    disconnect(): Promise<void> {
      state = "disconnected";
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      return Promise.resolve();
    },

    subscribe(subscriptions: SubscriptionConfig[]): Promise<void> {
      const defaultPollSeconds = 30;
      const pollIntervalMs = defaultPollSeconds * 1000;

      pollTimer = setInterval(() => {
        for (const sub of subscriptions) {
          metrics.messagesReceived += 1;
          metrics.lastMessageAt = Date.now();

          config.onMessage({
            connectorId: config.connectorId,
            protocol: "bacnet",
            topic: sub.topic,
            payload: {
              objectId: sub.topic,
              polledAt: Date.now(),
            },
            timestamp: Date.now(),
            qos: 0,
            retain: false,
          });

          metrics.messagesProcessed += 1;
        }
      }, pollIntervalMs);

      logger.info(
        {
          objectCount: subscriptions.length,
          pollIntervalMs,
          connectorId: config.connectorId,
        },
        "BACnet polling started"
      );
      return Promise.resolve();
    },

    unsubscribe(_topics: string[]): Promise<void> {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      return Promise.resolve();
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
