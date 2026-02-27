import { aiMetricsRegistry } from "@openplane/ai";
import { apiStreamRegistry } from "@openplane/api/observability/runtime-stream-metrics";
import { sessionStreamRegistry } from "@openplane/redis";
import { getOverviewRegistry } from "@openplane/services";
import { canvasMetricsRegistry } from "@openplane/temporal/observability";
import { Registry } from "prom-client";
import { register as serverMetricsRegistry } from "@/metrics";
import logger from "@/utils/logger";

let mergedMetricsRegistry: Registry | null = null;

function createMergedMetricsRegistry(): Registry {
  try {
    return Registry.merge([
      serverMetricsRegistry,
      aiMetricsRegistry,
      canvasMetricsRegistry,
      apiStreamRegistry,
      sessionStreamRegistry,
      getOverviewRegistry(),
    ]);
  } catch (error) {
    logger.error(
      { error },
      "Failed to merge metrics registries, falling back to server registry"
    );

    return serverMetricsRegistry;
  }
}

export function getMergedMetricsRegistry(): Registry {
  if (mergedMetricsRegistry) {
    return mergedMetricsRegistry;
  }

  mergedMetricsRegistry = createMergedMetricsRegistry();

  return mergedMetricsRegistry;
}

export async function getMergedMetrics(): Promise<string> {
  return await getMergedMetricsRegistry().metrics();
}

export function getMergedMetricsContentType(): string {
  return getMergedMetricsRegistry().contentType;
}
