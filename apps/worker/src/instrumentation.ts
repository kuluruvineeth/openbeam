/**
 * OpenTelemetry instrumentation for Worker.
 * Initialized explicitly at worker startup.
 */

import { config } from "dotenv";

config();

import { startTracing, stopTracing } from "@openbeam/observability";
import logger from "./utils/logger";

let initialized = false;
let tracingEnabled = false;

export function initializeInstrumentation(): boolean {
  if (initialized) {
    return tracingEnabled;
  }

  tracingEnabled = startTracing({
    serviceName: "openbeam-worker",
    enabled: process.env.OTEL_ENABLED !== "false",
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    ignoreIncomingPaths: ["/health", "/metrics"],
    logger,
  }).enabled;

  initialized = true;
  return tracingEnabled;
}

export function isTracingEnabled(): boolean {
  return tracingEnabled;
}

export async function shutdownInstrumentation(): Promise<void> {
  await stopTracing(logger);
}
