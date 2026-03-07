import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@opentelemetry/api", () => ({
  context: { active: vi.fn(), with: vi.fn() },
  propagation: { setGlobalPropagator: vi.fn() },
  SpanStatusCode: { OK: 0, ERROR: 2 },
  trace: {
    getTracer: vi.fn(() => ({
      startActiveSpan: vi.fn(),
    })),
    setSpan: vi.fn(),
  },
}));

vi.mock("@opentelemetry/core", () => ({
  CompositePropagator: vi.fn(),
  W3CBaggagePropagator: vi.fn(),
  W3CTraceContextPropagator: vi.fn(),
}));

vi.mock("@opentelemetry/exporter-trace-otlp-proto", () => ({
  OTLPTraceExporter: vi.fn(),
}));

vi.mock("@opentelemetry/resources", () => ({
  Resource: vi.fn(),
}));

vi.mock("@opentelemetry/sdk-trace-base", () => ({
  BatchSpanProcessor: vi.fn(),
  ConsoleSpanExporter: vi.fn(),
  SimpleSpanProcessor: vi.fn(),
}));

vi.mock("@opentelemetry/sdk-trace-node", () => ({
  NodeTracerProvider: vi.fn(() => ({
    addSpanProcessor: vi.fn(),
    register: vi.fn(),
    shutdown: vi.fn(),
  })),
}));

vi.mock("@opentelemetry/semantic-conventions", () => ({
  SEMRESATTRS_SERVICE_NAME: "service.name",
  SEMRESATTRS_SERVICE_VERSION: "service.version",
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT: "deployment.environment",
}));

vi.mock("@temporalio/interceptors-opentelemetry", () => ({
  makeWorkflowExporter: vi.fn(),
  OpenTelemetryActivityInboundInterceptor: vi.fn(),
}));

import {
  getTracerProvider,
  getWorkflowInterceptorModules,
  initializeTracing,
  loadTracingConfig,
  shutdownTracing,
} from "../observability/tracing";

describe("loadTracingConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns defaults when no env vars set", () => {
    process.env.OTEL_SERVICE_NAME = undefined;
    process.env.OTEL_SERVICE_VERSION = undefined;
    process.env.NODE_ENV = undefined;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = undefined;
    process.env.OTEL_SAMPLE_RATE = undefined;
    process.env.OTEL_ENABLED = undefined;
    process.env.OTEL_CONSOLE_EXPORT = undefined;

    const config = loadTracingConfig();

    expect(config.serviceName).toBe("openbeam-worker");
    expect(config.serviceVersion).toBe("1.0.0");
    expect(config.environment).toBe("development");
    expect(config.otlpEndpoint).toBeUndefined();
    expect(config.sampleRate).toBe(1.0);
    expect(config.enabled).toBe(true);
    expect(config.consoleExport).toBe(false);
  });

  it("reads OTEL_SERVICE_NAME from env", () => {
    process.env.OTEL_SERVICE_NAME = "custom-worker";
    const config = loadTracingConfig();
    expect(config.serviceName).toBe("custom-worker");
  });

  it("reads OTEL_SERVICE_VERSION from env", () => {
    process.env.OTEL_SERVICE_VERSION = "2.0.0";
    const config = loadTracingConfig();
    expect(config.serviceVersion).toBe("2.0.0");
  });

  it("reads NODE_ENV as environment", () => {
    process.env.NODE_ENV = "production";
    const config = loadTracingConfig();
    expect(config.environment).toBe("production");
  });

  it("reads OTEL_EXPORTER_OTLP_ENDPOINT", () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://collector:4318";
    const config = loadTracingConfig();
    expect(config.otlpEndpoint).toBe("http://collector:4318");
  });

  it("parses OTEL_SAMPLE_RATE as float", () => {
    process.env.OTEL_SAMPLE_RATE = "0.5";
    const config = loadTracingConfig();
    expect(config.sampleRate).toBe(0.5);
  });

  it("reads OTEL_ENABLED=false", () => {
    process.env.OTEL_ENABLED = "false";
    const config = loadTracingConfig();
    expect(config.enabled).toBe(false);
  });

  it("reads OTEL_CONSOLE_EXPORT=true", () => {
    process.env.OTEL_CONSOLE_EXPORT = "true";
    const config = loadTracingConfig();
    expect(config.consoleExport).toBe(true);
  });
});

describe("initializeTracing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" };
  });

  afterEach(async () => {
    await shutdownTracing();
    process.env = originalEnv;
  });

  it("does not create provider when disabled", () => {
    initializeTracing({ enabled: false });
    expect(getTracerProvider()).toBeNull();
  });

  it("is idempotent", () => {
    initializeTracing({ enabled: false });
    initializeTracing({ enabled: false });
    expect(getTracerProvider()).toBeNull();
  });
});

describe("shutdownTracing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resets provider to null", async () => {
    initializeTracing({
      enabled: true,
      environment: "development",
    });
    await shutdownTracing();
    expect(getTracerProvider()).toBeNull();
  });

  it("is safe to call when not initialized", async () => {
    await expect(shutdownTracing()).resolves.toBeUndefined();
  });
});

describe("getWorkflowInterceptorModules", () => {
  it("returns temporal opentelemetry workflow module", () => {
    const modules = getWorkflowInterceptorModules();
    expect(modules).toEqual([
      "@temporalio/interceptors-opentelemetry/lib/workflow",
    ]);
  });
});
