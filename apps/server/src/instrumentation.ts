import {
  closeCleanupQueue,
  closeIndexQueue,
  closeRedisClient,
  closeSharedBullMqConnection,
  closeSyncQueue,
  closeWebhookQueue,
} from "@openplane/redis";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { NodeSDK } from "@opentelemetry/sdk-node";
import logger from "./utils/logger";

const serviceName = "openplane-server";

const otlpExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://localhost:4318/v1/traces",
});

const sdk = new NodeSDK({
  serviceName,
  traceExporter: otlpExporter,
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (request) => {
        const url = request.url || "";
        return url.includes("/health") || url.includes("/metrics");
      },
    }),
    new IORedisInstrumentation(),
  ],
});

sdk.start();

async function gracefulShutdown(): Promise<void> {
  logger.info("Starting graceful shutdown...");

  await Promise.allSettled([
    sdk.shutdown(),
    closeSyncQueue(),
    closeIndexQueue(),
    closeWebhookQueue(),
    closeCleanupQueue(),
    closeSharedBullMqConnection(),
    closeRedisClient(),
  ]);

  logger.info("Graceful shutdown complete");
}

process.on("SIGTERM", () => {
  gracefulShutdown()
    .then(() => {
      logger.info("Server shut down successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, "Error during shutdown");
      process.exit(1);
    });
});

process.on("SIGINT", () => {
  gracefulShutdown()
    .then(() => {
      logger.info("Server shut down successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, "Error during shutdown");
      process.exit(1);
    });
});

export default sdk;
