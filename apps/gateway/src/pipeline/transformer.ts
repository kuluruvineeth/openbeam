import type {
  IndustrialTransformContext,
  TimeSeriesWindow,
} from "@openbeam/types/services/connectors/common/industrial";
import { IndustrialDocumentType } from "@openbeam/types/services/connectors/common/industrial";
import type { InternalMessage } from "@openbeam/types/services/connectors/mqtt";
import type { GenericDocument } from "@openbeam/vespa";
import { buildIsa95Metadata, buildIsa95Path, parseIsa95Path } from "./isa95";

export function transformTimeSeriesWindow(
  window: TimeSeriesWindow,
  ctx: IndustrialTransformContext
): GenericDocument {
  const title = `${ctx.deviceName ?? "Device"} ${ctx.metricName ?? "Metric"}`;
  const timeRange = formatTimeRange(window.startTime, window.endTime);

  return {
    id: `${ctx.connectorId}_ts_${ctx.metricKey}_${window.startTime}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: ctx.metricKey ?? "",
    document_type: IndustrialDocumentType.SENSOR_READING,
    document_subtype: ctx.metricType,
    title,
    content: [
      `${ctx.metricName}: ${window.last} ${window.unit}`,
      `Range: ${window.min} - ${window.max} ${window.unit}`,
      `Average: ${window.avg.toFixed(2)} ${window.unit}`,
      `Samples: ${window.sampleCount} over ${timeRange}`,
      ctx.deviceName ? `Device: ${ctx.deviceName}` : null,
      ctx.isa95Path ? `Location: ${ctx.isa95Path}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    source_type: ctx.connectorType,
    source_name: ctx.sourceName,
    source_path: ctx.isa95Path,
    created_at: window.startTime,
    updated_at: window.endTime,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    labels: ctx.isa95Labels,
    metadata: {
      protocol: ctx.protocol,
      windowStart: window.startTime,
      windowEnd: window.endTime,
      sampleCount: window.sampleCount,
      min: window.min,
      max: window.max,
      avg: window.avg,
      last: window.last,
      stdDev: window.stdDev,
      unit: window.unit,
      ...ctx.isa95Metadata,
    },
  };
}

export function transformEventMessage(
  message: InternalMessage,
  ctx: IndustrialTransformContext
): GenericDocument {
  const documentType = classifyEventType(message);
  const isa95 = parseIsa95Path(message.topic);
  const isa95Path = buildIsa95Path(isa95);
  const isa95Metadata = buildIsa95Metadata(isa95);

  return {
    id: `${message.connectorId}_${ctx.protocol}_${documentType}_${message.timestamp}`,
    connector_id: message.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: message.topic,
    document_type: documentType,
    title: buildEventTitle(message, documentType),
    content: buildEventContent(message, documentType),
    source_type: ctx.connectorType,
    source_name: ctx.sourceName,
    source_path: isa95Path,
    created_at: message.timestamp,
    updated_at: message.timestamp,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    labels: isa95.labels,
    metadata: {
      protocol: ctx.protocol,
      topic: message.topic,
      qos: message.qos,
      retain: message.retain,
      ...isa95Metadata,
      ...flattenPayload(message.payload),
    },
  };
}

function classifyEventType(message: InternalMessage): string {
  const topic = message.topic.toLowerCase();
  const sparkplug = message.payload._sparkplug as
    | { messageType?: string }
    | undefined;

  if (sparkplug?.messageType) {
    const type = sparkplug.messageType;
    if (type === "NBIRTH" || type === "DBIRTH") {
      return IndustrialDocumentType.DEVICE_BIRTH;
    }
    if (type === "NDEATH" || type === "DDEATH") {
      return IndustrialDocumentType.DEVICE_STATE;
    }
  }

  if (topic.includes("alarm") || topic.includes("alert")) {
    return IndustrialDocumentType.ALARM;
  }
  if (topic.includes("state") || topic.includes("status")) {
    return IndustrialDocumentType.DEVICE_STATE;
  }
  if (topic.includes("production") || topic.includes("oee")) {
    return IndustrialDocumentType.PRODUCTION_METRIC;
  }

  return IndustrialDocumentType.DEVICE_STATE;
}

function buildEventTitle(
  message: InternalMessage,
  documentType: string
): string {
  const parts = message.topic.split("/").filter(Boolean);
  const device = parts.at(-2) ?? "device";
  const datapoint = parts.at(-1) ?? "event";

  switch (documentType) {
    case IndustrialDocumentType.ALARM:
      return `Alarm: ${device} ${datapoint}`;
    case IndustrialDocumentType.DEVICE_BIRTH:
      return `Device Birth: ${device}`;
    case IndustrialDocumentType.DEVICE_STATE:
      return `State Change: ${device} ${datapoint}`;
    case IndustrialDocumentType.PRODUCTION_METRIC:
      return `Production: ${device} ${datapoint}`;
    default:
      return `${device} ${datapoint}`;
  }
}

function buildEventContent(
  message: InternalMessage,
  documentType: string
): string {
  const parts = message.topic.split("/").filter(Boolean);
  const device = parts.at(-2) ?? "device";
  const lines: string[] = [];

  switch (documentType) {
    case IndustrialDocumentType.ALARM: {
      const severity = (message.payload.severity as string) ?? "unknown";
      const text =
        (message.payload.message as string) ??
        (message.payload.text as string) ??
        "";
      lines.push(`Alarm on ${device}: ${text}`);
      lines.push(`Severity: ${severity}`);
      break;
    }
    case IndustrialDocumentType.DEVICE_BIRTH: {
      lines.push(`Device ${device} came online.`);
      const metrics = message.payload.metrics as
        | Record<string, unknown>
        | undefined;
      if (metrics) {
        lines.push(`Metrics: ${Object.keys(metrics).join(", ")}`);
      }
      break;
    }
    default: {
      lines.push(`Event from ${device} on topic ${message.topic}.`);
      const payload = JSON.stringify(message.payload, null, 2);
      if (payload.length < 500) {
        lines.push(payload);
      }
    }
  }

  lines.push(`Topic: ${message.topic}`);
  return lines.join("\n");
}

function flattenPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key.startsWith("_")) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      flat[key] = value;
    }
  }
  return flat;
}

function formatTimeRange(startMs: number, endMs: number): string {
  const durationMs = endMs - startMs;
  if (durationMs < 60_000) {
    return `${Math.round(durationMs / 1000)}s`;
  }
  if (durationMs < 3_600_000) {
    return `${Math.round(durationMs / 60_000)}m`;
  }
  return `${(durationMs / 3_600_000).toFixed(1)}h`;
}
