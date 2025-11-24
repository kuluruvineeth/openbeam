import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { NodeSDK } from "@opentelemetry/sdk-node";

const serviceName = "openplane-server";

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
    // HTTP instrumentation for incoming/outgoing requests
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (request) => {
        // Don't trace health checks and metrics endpoints
        const url = request.url || "";
        return url.includes("/health") || url.includes("/metrics");
      },
    }),
    // Redis instrumentation for BullMQ and cache operations
    new IORedisInstrumentation(),
  ],
});

// Start the SDK
sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OpenTelemetry SDK shut down successfully"))
    .catch((error) =>
      console.error("Error shutting down OpenTelemetry SDK", error)
    );
});

export default sdk;
