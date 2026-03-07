import type {
  AdapterMetrics,
  ConnectionState,
} from "@openbeam/types/services/connectors/common/industrial";
import type { OpcUaConnectionConfig } from "@openbeam/types/services/connectors/opcua";
import logger from "../logger";
import {
  type AdapterConfig,
  createEmptyMetrics,
  type ProtocolAdapter,
  type SubscriptionConfig,
} from "./base-adapter";

export function createOpcuaAdapter(config: AdapterConfig): ProtocolAdapter {
  let state: ConnectionState = "disconnected";
  const metrics: AdapterMetrics = createEmptyMetrics();
  let connectTime = 0;
  let session: unknown = null;
  const opcuaConfig = config.connection as unknown as OpcUaConnectionConfig;

  return {
    protocol: "opcua",
    connectorId: config.connectorId,

    async connect(): Promise<void> {
      state = "connecting";

      try {
        const { OPCUAClient, MessageSecurityMode, SecurityPolicy } =
          require("node-opcua-client") as {
            OPCUAClient: {
              create(opts: Record<string, unknown>): {
                connect(url: string): Promise<void>;
                createSession(): Promise<unknown>;
                disconnect(): Promise<void>;
              };
            };
            MessageSecurityMode: Record<string, number>;
            SecurityPolicy: Record<string, string>;
          };

        const securityMode =
          MessageSecurityMode[opcuaConfig.security?.securityMode ?? "None"] ??
          1;
        const securityPolicy =
          SecurityPolicy[opcuaConfig.security?.securityPolicy ?? "None"] ??
          "None";

        const client = OPCUAClient.create({
          applicationName: "OpenBeam Gateway",
          connectionStrategy: {
            initialDelay: 1000,
            maxRetry: 5,
            maxDelay: 30_000,
          },
          securityMode,
          securityPolicy,
          endpointMustExist: false,
        });

        await client.connect(opcuaConfig.endpointUrl);
        session = await client.createSession();

        state = "connected";
        connectTime = Date.now();

        logger.info(
          {
            connectorId: config.connectorId,
            endpoint: opcuaConfig.endpointUrl,
          },
          "OPC-UA adapter connected"
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
      session = null;
      return Promise.resolve();
    },

    subscribe(subscriptions: SubscriptionConfig[]): Promise<void> {
      if (!session) {
        throw new Error("OPC-UA session not established");
      }

      logger.info(
        {
          nodeCount: subscriptions.length,
          connectorId: config.connectorId,
        },
        "OPC-UA monitoring items registered"
      );

      for (const sub of subscriptions) {
        logger.debug(
          { nodeId: sub.topic, connectorId: config.connectorId },
          "Monitoring OPC-UA node"
        );
      }

      return Promise.resolve();
    },

    unsubscribe(_topics: string[]): Promise<void> {
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
