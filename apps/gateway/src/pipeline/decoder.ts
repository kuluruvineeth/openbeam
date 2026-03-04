import type {
  SparkplugMetric,
  SparkplugPayload,
} from "@openplane/types/services/connectors/mqtt";
import logger from "../logger";

type PayloadFormat = "json" | "sparkplug_b" | "cbor" | "raw";

export function decodePayload(
  buf: Buffer,
  format: PayloadFormat,
  topic: string
): Record<string, unknown> | null {
  switch (format) {
    case "json":
      return decodeJson(buf, topic);
    case "sparkplug_b":
      return decodeSparkplugB(buf, topic);
    case "cbor":
      return decodeCbor(buf, topic);
    case "raw":
      return decodeRaw(buf, topic);
    default:
      logger.warn({ format, topic }, "Unknown payload format");
      return null;
  }
}

function decodeJson(
  buf: Buffer,
  topic: string
): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(buf.toString("utf-8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    logger.warn({ topic, size: buf.length }, "Failed to decode JSON payload");
    return null;
  }
}

function decodeSparkplugB(
  buf: Buffer,
  topic: string
): Record<string, unknown> | null {
  try {
    const sparkplug = require("sparkplug-payload") as {
      get(version: string): { decodePayload(data: Buffer): SparkplugPayload };
    };
    const payload = sparkplug.get("spBv1.0").decodePayload(buf);
    return sparkplugToJson(payload, topic);
  } catch (err) {
    logger.warn({ topic, err }, "Failed to decode Sparkplug B payload");
    return null;
  }
}

function decodeCbor(
  buf: Buffer,
  topic: string
): Record<string, unknown> | null {
  try {
    const cborx = require("cbor-x") as { decode(data: Buffer): unknown };
    const parsed = cborx.decode(buf);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch (err) {
    logger.warn({ topic, err }, "Failed to decode CBOR payload");
    return null;
  }
}

function decodeRaw(buf: Buffer, topic: string): Record<string, unknown> {
  const utf8 = buf.toString("utf-8");
  const isUtf8 = !utf8.includes("\ufffd");

  return {
    raw: isUtf8 ? utf8 : buf.toString("hex"),
    encoding: isUtf8 ? "utf-8" : "hex",
    size: buf.length,
    topic,
  };
}

function extractSparkplugValue(metric: SparkplugMetric): unknown {
  if (metric.isNull) {
    return null;
  }
  return metric.value;
}

function extractMessageType(topic: string): string {
  const parts = topic.split("/");
  return parts[2] ?? "UNKNOWN";
}

function sparkplugToJson(
  payload: SparkplugPayload,
  topic: string
): Record<string, unknown> {
  const metrics: Record<string, unknown> = {};
  for (const metric of payload.metrics ?? []) {
    const key = metric.name ?? `alias_${metric.alias}`;
    metrics[key] = {
      value: extractSparkplugValue(metric),
      type: metric.datatype,
      timestamp: metric.timestamp,
      isHistorical: metric.isHistorical,
    };
  }
  return {
    timestamp: payload.timestamp,
    seq: payload.seq,
    metrics,
    _sparkplug: { topic, messageType: extractMessageType(topic) },
  };
}
