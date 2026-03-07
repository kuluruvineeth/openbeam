import { Hono } from "hono";
import type { ProtocolAdapter } from "./adapters/base-adapter";
import { loadConfig } from "./config";
import { healthCheck } from "./health";
import logger from "./logger";
import { metricsEndpoint } from "./metrics/prometheus";
import { createAdapter } from "./registry/adapter-registry";

const config = loadConfig();
const adapters = new Map<string, ProtocolAdapter>();
const gatewayStartTime = Date.now();

const app = new Hono();

app.get("/health", healthCheck(adapters));
app.get("/metrics", metricsEndpoint(adapters, gatewayStartTime));

app.get("/", (c) =>
  c.json({
    service: "openbeam-gateway",
    version: "0.1.0",
    protocols: ["mqtt", "opcua", "bacnet"],
    adapters: adapters.size,
  })
);

async function initializeAdapters(): Promise<void> {
  for (const adapterConfig of config.adapters) {
    if (!adapterConfig.enabled) {
      logger.info(
        {
          connectorId: adapterConfig.connectorId,
          protocol: adapterConfig.protocol,
        },
        "Adapter disabled, skipping"
      );
      continue;
    }

    try {
      const adapter = createAdapter({
        connectorId: adapterConfig.connectorId,
        teamId: adapterConfig.teamId,
        protocol: adapterConfig.protocol,
        connection: adapterConfig.connection,
        subscriptions: adapterConfig.subscriptions.map((s) => ({
          topic: s.topic,
          qos: s.qos,
          payloadFormat: s.payloadFormat,
          aggregationWindow: s.aggregationWindow,
        })),
        aggregation: adapterConfig.aggregation,
        onMessage: (message) => {
          logger.debug(
            { connectorId: message.connectorId, topic: message.topic },
            "Message received"
          );
        },
      });

      await adapter.connect();
      adapters.set(adapterConfig.connectorId, adapter);

      logger.info(
        {
          connectorId: adapterConfig.connectorId,
          protocol: adapterConfig.protocol,
        },
        "Adapter initialized"
      );
    } catch (err) {
      logger.error(
        {
          connectorId: adapterConfig.connectorId,
          protocol: adapterConfig.protocol,
          error: err instanceof Error ? err.message : String(err),
        },
        "Failed to initialize adapter"
      );
    }
  }
}

const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

initializeAdapters()
  .then(() => {
    logger.info(
      {
        port: config.port,
        activeAdapters: adapters.size,
        configuredAdapters: config.adapters.length,
      },
      "Gateway started"
    );
  })
  .catch((err) => {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      "Gateway initialization failed"
    );
  });

process.on("SIGTERM", async () => {
  logger.info("Shutting down gateway");
  for (const [id, adapter] of adapters) {
    logger.info({ id }, "Disconnecting adapter");
    await adapter.disconnect();
  }
  server.stop();
  process.exit(0);
});
