import {
  context,
  propagation,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { Context as ActivityContext } from "@temporalio/activity";
import {
  makeWorkflowExporter,
  OpenTelemetryActivityInboundInterceptor,
} from "@temporalio/interceptors-opentelemetry";
import type { ActivityInboundCallsInterceptor } from "@temporalio/worker";
import { z } from "zod";

const TracingConfigSchema = z.object({
  serviceName: z.string().default("openplane-worker"),
  serviceVersion: z.string().default("1.0.0"),
  environment: z
    .enum(["development", "staging", "production"])
    .default("development"),
  otlpEndpoint: z.string().optional(),
  sampleRate: z.number().min(0).max(1).default(1.0),
  enabled: z.boolean().default(true),
  consoleExport: z.boolean().default(false),
});

export type TracingConfig = z.infer<typeof TracingConfigSchema>;

let tracerProvider: NodeTracerProvider | null = null;
let isInitialized = false;

export function loadTracingConfig(): TracingConfig {
  return TracingConfigSchema.parse({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "openplane-worker",
    serviceVersion: process.env.OTEL_SERVICE_VERSION ?? "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    sampleRate: process.env.OTEL_SAMPLE_RATE
      ? Number.parseFloat(process.env.OTEL_SAMPLE_RATE)
      : 1.0,
    enabled: process.env.OTEL_ENABLED !== "false",
    consoleExport: process.env.OTEL_CONSOLE_EXPORT === "true",
  });
}

export function initializeTracing(config?: Partial<TracingConfig>): void {
  if (isInitialized) {
    return;
  }

  const fullConfig = TracingConfigSchema.parse({
    ...loadTracingConfig(),
    ...config,
  });

  if (!fullConfig.enabled) {
    isInitialized = true;
    return;
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: fullConfig.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: fullConfig.serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: fullConfig.environment,
  });

  tracerProvider = new NodeTracerProvider({ resource });

  if (fullConfig.otlpEndpoint) {
    const otlpExporter = new OTLPTraceExporter({
      url: fullConfig.otlpEndpoint,
      headers: {},
    });

    tracerProvider.addSpanProcessor(new BatchSpanProcessor(otlpExporter));
  }

  if (
    fullConfig.consoleExport ||
    (!fullConfig.otlpEndpoint && fullConfig.environment === "development")
  ) {
    tracerProvider.addSpanProcessor(
      new SimpleSpanProcessor(new ConsoleSpanExporter())
    );
  }

  tracerProvider.register();

  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    })
  );

  isInitialized = true;
}

export function getTracerProvider(): NodeTracerProvider | null {
  return tracerProvider;
}

export function getTracer(name = "@openplane/temporal") {
  return trace.getTracer(name);
}

export async function shutdownTracing(): Promise<void> {
  if (tracerProvider) {
    await tracerProvider.shutdown();
    tracerProvider = null;
    isInitialized = false;
  }
}

export interface TemporalTracingInterceptors {
  activityInbound: (ctx: ActivityContext) => ActivityInboundCallsInterceptor;
  workflowModules: string[];
}

export function createTemporalTracingInterceptors(): TemporalTracingInterceptors {
  initializeTracing();

  return {
    activityInbound: (ctx) => new OpenTelemetryActivityInboundInterceptor(ctx),
    workflowModules: [],
  };
}

export function getWorkflowInterceptorModules(): string[] {
  return ["@temporalio/interceptors-opentelemetry/lib/workflow"];
}

export function createWorkflowTracingExporter() {
  const config = loadTracingConfig();

  if (!(config.enabled && config.otlpEndpoint)) {
    return;
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: `${config.serviceName}-workflow`,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment,
  });

  const exporter = new OTLPTraceExporter({ url: config.otlpEndpoint });

  return makeWorkflowExporter(exporter, resource);
}

export function traceActivity<T>(
  activityName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(
    `temporal.activity.${activityName}`,
    { attributes },
    async (span) => {
      try {
        const result = await context.with(
          trace.setSpan(context.active(), span),
          fn
        );
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });

        if (error instanceof Error) {
          span.recordException(error);
        }

        throw error;
      } finally {
        span.end();
      }
    }
  );
}
