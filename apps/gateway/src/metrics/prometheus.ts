import type { Context } from "hono";
import type { ProtocolAdapter } from "../adapters/base-adapter";

export interface MetricLine {
  name: string;
  help: string;
  type: "counter" | "gauge" | "histogram";
  values: { labels: Record<string, string>; value: number }[];
}

export function formatMetric(metric: MetricLine): string {
  const lines: string[] = [
    `# HELP ${metric.name} ${metric.help}`,
    `# TYPE ${metric.name} ${metric.type}`,
  ];

  for (const entry of metric.values) {
    const labelParts = Object.entries(entry.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");

    const labelStr = labelParts.length > 0 ? `{${labelParts}}` : "";
    lines.push(`${metric.name}${labelStr} ${entry.value}`);
  }

  return lines.join("\n");
}

export function collectAdapterMetrics(
  adapters: Map<string, ProtocolAdapter>
): MetricLine[] {
  const metrics: MetricLine[] = [];

  const connectionState: MetricLine = {
    name: "gateway_adapter_connection_state",
    help: "Current connection state (1=connected, 0=other)",
    type: "gauge",
    values: [],
  };

  const messagesReceived: MetricLine = {
    name: "gateway_adapter_messages_received_total",
    help: "Total messages received by adapter",
    type: "counter",
    values: [],
  };

  const messagesProcessed: MetricLine = {
    name: "gateway_adapter_messages_processed_total",
    help: "Total messages processed by adapter",
    type: "counter",
    values: [],
  };

  const messagesDropped: MetricLine = {
    name: "gateway_adapter_messages_dropped_total",
    help: "Total messages dropped by adapter",
    type: "counter",
    values: [],
  };

  const errorCount: MetricLine = {
    name: "gateway_adapter_errors_total",
    help: "Total errors encountered by adapter",
    type: "counter",
    values: [],
  };

  const reconnectCount: MetricLine = {
    name: "gateway_adapter_reconnects_total",
    help: "Total reconnection attempts by adapter",
    type: "counter",
    values: [],
  };

  const connectionUptime: MetricLine = {
    name: "gateway_adapter_connection_uptime_seconds",
    help: "Current connection uptime in seconds",
    type: "gauge",
    values: [],
  };

  const lastMessageAge: MetricLine = {
    name: "gateway_adapter_last_message_age_seconds",
    help: "Seconds since last message received",
    type: "gauge",
    values: [],
  };

  const now = Date.now();

  for (const [id, adapter] of adapters) {
    const m = adapter.getMetrics();
    const state = adapter.getConnectionState();
    const labels = {
      connector_id: id,
      protocol: adapter.protocol,
    };

    connectionState.values.push({
      labels,
      value: state === "connected" ? 1 : 0,
    });

    messagesReceived.values.push({ labels, value: m.messagesReceived });
    messagesProcessed.values.push({ labels, value: m.messagesProcessed });
    messagesDropped.values.push({ labels, value: m.messagesDropped });
    errorCount.values.push({ labels, value: m.errorCount });
    reconnectCount.values.push({ labels, value: m.reconnectCount });

    connectionUptime.values.push({
      labels,
      value: Math.round(m.connectionUptime / 1000),
    });

    lastMessageAge.values.push({
      labels,
      value:
        m.lastMessageAt > 0 ? Math.round((now - m.lastMessageAt) / 1000) : -1,
    });
  }

  metrics.push(
    connectionState,
    messagesReceived,
    messagesProcessed,
    messagesDropped,
    errorCount,
    reconnectCount,
    connectionUptime,
    lastMessageAge
  );

  return metrics;
}

export function collectGatewayMetrics(startTime: number): MetricLine[] {
  return [
    {
      name: "gateway_uptime_seconds",
      help: "Gateway process uptime in seconds",
      type: "gauge",
      values: [
        { labels: {}, value: Math.round((Date.now() - startTime) / 1000) },
      ],
    },
    {
      name: "gateway_info",
      help: "Gateway build information",
      type: "gauge",
      values: [{ labels: { version: "0.1.0" }, value: 1 }],
    },
  ];
}

export function metricsEndpoint(
  adapters: Map<string, ProtocolAdapter>,
  startTime: number
) {
  return (c: Context) => {
    const allMetrics = [
      ...collectGatewayMetrics(startTime),
      ...collectAdapterMetrics(adapters),
    ];

    const body = allMetrics.map(formatMetric).join("\n\n");

    return c.text(`${body}\n`, 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    });
  };
}
