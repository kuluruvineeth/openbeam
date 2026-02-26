import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { Logger } from "pino";

export interface StartTracingOptions {
  serviceName: string;
  enabled?: boolean;
  otlpEndpoint?: string;
  ignoreIncomingPaths?: string[];
  serviceVersion?: string;
  environment?: string;
  logger?: Logger;
}

export interface TracingHandle {
  enabled: boolean;
  sdk: NodeTracerProvider | null;
}

let sdk: NodeTracerProvider | null = null;
let initialized = false;

function shouldIgnoreRequest(
  url: string,
  ignoreIncomingPaths: string[]
): boolean {
  return ignoreIncomingPaths.some((path) => url.includes(path));
}

export function startTracing(options: StartTracingOptions): TracingHandle {
  if (initialized) {
    return {
      enabled: sdk !== null,
      sdk,
    };
  }

  const otlpEndpoint =
    options.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const tracingEnabled =
    options.enabled ??
    (process.env.OTEL_ENABLED !== "false" && Boolean(otlpEndpoint));

  if (!(tracingEnabled && otlpEndpoint)) {
    initialized = true;
    options.logger?.info(
      "OpenTelemetry tracing disabled (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)"
    );
    return { enabled: false, sdk: null };
  }

  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: options.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]:
      options.serviceVersion ?? process.env.APP_VERSION ?? "0.1.0",
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
      options.environment ?? process.env.NODE_ENV ?? "development",
  });

  sdk = new NodeTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: otlpEndpoint,
        })
      ),
    ],
  });

  sdk.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request) => {
          const url = request.url ?? "";
          return shouldIgnoreRequest(url, options.ignoreIncomingPaths ?? []);
        },
      }),
      new IORedisInstrumentation(),
    ],
  });
  initialized = true;

  options.logger?.info(
    { otlpEndpoint, service: options.serviceName },
    "OpenTelemetry tracing enabled"
  );

  return { enabled: true, sdk };
}

export async function stopTracing(logger?: Logger): Promise<void> {
  if (!sdk) {
    return;
  }

  try {
    await sdk.shutdown();
    logger?.info("OpenTelemetry SDK shut down successfully");
  } catch (error) {
    logger?.error({ error }, "Error shutting down OpenTelemetry SDK");
    throw error;
  } finally {
    sdk = null;
    initialized = false;
  }
}
