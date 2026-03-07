import { describe, expect, it } from "bun:test";
import {
  buildHttpMetricLabels,
  collectProcessMetrics,
  createRegistry,
  safeCounter,
  safeGauge,
} from "../metrics";

describe("metrics helpers", () => {
  it("returns the same metric instance for duplicate counter definitions", () => {
    const registry = createRegistry();
    const metricName = "openbeam_test_counter_total";

    const first = safeCounter(
      {
        name: metricName,
        help: "Test counter metric",
        labelNames: ["status"] as const,
      },
      registry
    );
    const second = safeCounter(
      {
        name: metricName,
        help: "Test counter metric",
        labelNames: ["status"] as const,
      },
      registry
    );

    expect(first).toBe(second);
  });

  it("throws clear errors for metric type conflicts", () => {
    const registry = createRegistry();
    const metricName = "openbeam_test_metric_conflict";

    safeGauge(
      {
        name: metricName,
        help: "Metric created as gauge",
      },
      registry
    );

    expect(() =>
      safeCounter(
        {
          name: metricName,
          help: "Metric created as counter",
        },
        registry
      )
    ).toThrow(`Metric "${metricName}" already registered as gauge`);
  });

  it("collects process metrics only once per registry", async () => {
    const registry = createRegistry({
      defaultLabels: {
        service: "openbeam-observability-test",
      },
    });

    collectProcessMetrics(registry);
    collectProcessMetrics(registry);

    const metrics = await registry.metrics();

    expect(metrics).toContain("process_cpu_user_seconds_total");
    expect(metrics).toContain('service="openbeam-observability-test"');
  });

  it("normalizes HTTP labels to telemetry contract keys", () => {
    const labels = buildHttpMetricLabels({
      method: "POST",
      route: "/api/v1/connectors/:id/sync",
      statusCode: 202,
      service: "openbeam-worker",
      env: "staging",
      connectorType: "github",
      workerType: "sync",
    });

    expect(labels.method).toBe("POST");
    expect(labels.route).toBe("/api/v1/connectors/:id/sync");
    expect(labels.status_code).toBe("202");
    expect(labels.connector_type).toBe("github");
    expect(labels.worker_type).toBe("sync");
  });
});
