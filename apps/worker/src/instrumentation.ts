/**
 * OpenTelemetry Instrumentation for Worker
 * MUST be imported before any other modules to ensure proper instrumentation
 */

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { NodeSDK } from "@opentelemetry/sdk-node";
import logger from "./utils/logger";

const serviceName = "openplane-worker";

// Configure OTLP exporter (Jaeger)
const otlpExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://localhost:4318/v1/traces",
});

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  serviceName,
  traceExporter: otlpExporter,
  instrumentations: [
    // HTTP instrumentation for outgoing requests (to connectors, Vespa)
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (request) => {
        // Don't trace health checks and metrics endpoints
        const url = request.url || "";
        return url.includes("/health") || url.includes("/metrics");
      },
    }),
    // Redis instrumentation for BullMQ operations
    new IORedisInstrumentation(),
  ],
});

// Start the SDK
sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => logger.info({}, "OpenTelemetry SDK shut down successfully"))
    .catch((error) =>
      logger.error({ error }, "Error shutting down OpenTelemetry SDK")
    );
});

export default sdk;
