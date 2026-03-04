import { describe, expect, it } from "bun:test";
import type { ProtocolAdapter } from "../../adapters/base-adapter";
import {
  collectAdapterMetrics,
  collectGatewayMetrics,
  formatMetric,
  type MetricLine,
} from "../prometheus";

const noop = async () => Promise.resolve();

function createMockAdapter(
  overrides?: Partial<ProtocolAdapter>
): ProtocolAdapter {
  return {
    protocol: "mqtt",
    connectorId: "conn_1",
    connect: noop,
    disconnect: noop,
    subscribe: noop,
    unsubscribe: noop,
    getConnectionState: () => "connected",
    getMetrics: () => ({
      messagesReceived: 150,
      messagesProcessed: 140,
      messagesDropped: 10,
      lastMessageAt: Date.now() - 5000,
      connectionUptime: 3_600_000,
      reconnectCount: 2,
      errorCount: 1,
    }),
    ...overrides,
  } as ProtocolAdapter;
}

describe("formatMetric", () => {
  it("formats HELP line", () => {
    const metric: MetricLine = {
      name: "test_metric",
      help: "Test help text",
      type: "gauge",
      values: [{ labels: { foo: "bar" }, value: 42 }],
    };
    const output = formatMetric(metric);
    expect(output).toContain("# HELP test_metric Test help text");
  });

  it("formats TYPE line", () => {
    const metric: MetricLine = {
      name: "test_metric",
      help: "Test help text",
      type: "gauge",
      values: [{ labels: { foo: "bar" }, value: 42 }],
    };
    const output = formatMetric(metric);
    expect(output).toContain("# TYPE test_metric gauge");
  });

  it("formats metric with labels", () => {
    const metric: MetricLine = {
      name: "test_metric",
      help: "Some help",
      type: "gauge",
      values: [{ labels: { key1: "val1", key2: "val2" }, value: 42 }],
    };
    const output = formatMetric(metric);
    expect(output).toContain('test_metric{key1="val1",key2="val2"} 42');
  });

  it("formats metric without labels", () => {
    const metric: MetricLine = {
      name: "test_metric",
      help: "Some help",
      type: "gauge",
      values: [{ labels: {}, value: 42 }],
    };
    const output = formatMetric(metric);
    expect(output).toContain("test_metric 42");
    expect(output).not.toContain("{}");
  });
});

describe("collectAdapterMetrics", () => {
  it("returns 8 metric lines for one adapter", () => {
    const adapters = new Map([["conn_1", createMockAdapter()]]);
    const metrics = collectAdapterMetrics(adapters);
    expect(metrics).toHaveLength(8);
  });

  it("sets connection_state to 1 for connected adapter", () => {
    const adapters = new Map([["conn_1", createMockAdapter()]]);
    const metrics = collectAdapterMetrics(adapters);
    const stateMetric = metrics.find(
      (m) => m.name === "gateway_adapter_connection_state"
    );
    expect(stateMetric?.values[0]?.value).toBe(1);
  });

  it("sets connection_state to 0 for disconnected adapter", () => {
    const adapters = new Map([
      [
        "conn_1",
        createMockAdapter({ getConnectionState: () => "disconnected" }),
      ],
    ]);
    const metrics = collectAdapterMetrics(adapters);
    const stateMetric = metrics.find(
      (m) => m.name === "gateway_adapter_connection_state"
    );
    expect(stateMetric?.values[0]?.value).toBe(0);
  });

  it("reports messages_received_total matching adapter metrics", () => {
    const adapters = new Map([["conn_1", createMockAdapter()]]);
    const metrics = collectAdapterMetrics(adapters);
    const received = metrics.find(
      (m) => m.name === "gateway_adapter_messages_received_total"
    );
    expect(received?.values[0]?.value).toBe(150);
  });

  it("returns -1 for last_message_age when lastMessageAt is 0", () => {
    const adapters = new Map([
      [
        "conn_1",
        createMockAdapter({
          getMetrics: () => ({
            messagesReceived: 0,
            messagesProcessed: 0,
            messagesDropped: 0,
            lastMessageAt: 0,
            connectionUptime: 0,
            reconnectCount: 0,
            errorCount: 0,
          }),
        }),
      ],
    ]);
    const metrics = collectAdapterMetrics(adapters);
    const age = metrics.find(
      (m) => m.name === "gateway_adapter_last_message_age_seconds"
    );
    expect(age?.values[0]?.value).toBe(-1);
  });

  it("produces correct number of value entries for multiple adapters", () => {
    const adapters = new Map([
      ["conn_1", createMockAdapter()],
      [
        "conn_2",
        createMockAdapter({
          connectorId: "conn_2",
          protocol: "opcua",
        }),
      ],
    ]);
    const metrics = collectAdapterMetrics(adapters);
    for (const metric of metrics) {
      expect(metric.values).toHaveLength(2);
    }
  });
});

describe("collectGatewayMetrics", () => {
  it("returns 2 metrics", () => {
    const metrics = collectGatewayMetrics(Date.now() - 60_000);
    expect(metrics).toHaveLength(2);
  });

  it("computes uptime_seconds roughly as (now - startTime) / 1000", () => {
    const startTime = Date.now() - 120_000;
    const metrics = collectGatewayMetrics(startTime);
    const uptime = metrics.find((m) => m.name === "gateway_uptime_seconds");
    const value = uptime?.values[0]?.value ?? 0;
    expect(value).toBeGreaterThanOrEqual(119);
    expect(value).toBeLessThanOrEqual(121);
  });

  it("includes gateway_info with version label and value 1", () => {
    const metrics = collectGatewayMetrics(Date.now());
    const info = metrics.find((m) => m.name === "gateway_info");
    expect(info?.values[0]?.labels).toEqual({ version: "0.1.0" });
    expect(info?.values[0]?.value).toBe(1);
  });
});
