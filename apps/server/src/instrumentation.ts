import { startTracing, stopTracing } from "@openplane/observability";
import { closeRedisClient } from "@openplane/redis";
import logger from "./utils/logger";

const serviceName = "openplane-server";

const tracingHandle = startTracing({
  serviceName,
  enabled: process.env.OTEL_ENABLED !== "false",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  ignoreIncomingPaths: ["/health", "/metrics"],
  logger,
});

async function gracefulShutdown(): Promise<void> {
  logger.info("Starting graceful shutdown...");

  const shutdownTasks: Promise<unknown>[] = [closeRedisClient()];

  if (tracingHandle.enabled) {
    shutdownTasks.push(stopTracing(logger));
  }

  await Promise.allSettled(shutdownTasks);

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
