import { z } from "zod";

export const Isa95LevelNames = [
  "enterprise",
  "site",
  "area",
  "line",
  "cell",
  "device",
  "datapoint",
] as const;

export const Isa95ContextSchema = z.object({
  enterprise: z.string().optional(),
  site: z.string().optional(),
  area: z.string().optional(),
  line: z.string().optional(),
  cell: z.string().optional(),
  device: z.string().optional(),
  datapoint: z.string().optional(),
  labels: z.array(z.string()),
});

export type Isa95Context = z.infer<typeof Isa95ContextSchema>;

export const TimeSeriesWindowSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  sampleCount: z.number(),
  min: z.number(),
  max: z.number(),
  avg: z.number(),
  first: z.number(),
  last: z.number(),
  stdDev: z.number(),
  unit: z.string(),
});

export type TimeSeriesWindow = z.infer<typeof TimeSeriesWindowSchema>;

export const AggregationConfigSchema = z.object({
  defaultWindowSeconds: z.number().default(60),
  eventPassthrough: z.boolean().default(true),
  maxWindowSize: z.number().default(10_000),
});

export type AggregationConfig = z.infer<typeof AggregationConfigSchema>;

export const IndustrialTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  protocol: z.string(),
  sourceName: z.string(),
  isa95Path: z.string().optional(),
  isa95Labels: z.array(z.string()).optional(),
  isa95Metadata: z.record(z.string(), z.string()).optional(),
  deviceName: z.string().optional(),
  deviceId: z.string().optional(),
  deviceType: z.string().optional(),
  metricName: z.string().optional(),
  metricKey: z.string().optional(),
  metricType: z.string().optional(),
  plantTimezone: z.string().optional(),
});

export type IndustrialTransformContext = z.infer<
  typeof IndustrialTransformContextSchema
>;

export const IndustrialDocumentType = {
  SENSOR_READING: "sensor_reading",
  DEVICE_STATE: "device_state",
  ALARM: "alarm",
  PRODUCTION_METRIC: "production_metric",
  DEVICE_BIRTH: "device_birth",
  SCHEDULE: "schedule",
  TREND_DATA: "trend_data",
  AUTOMATION_FLOW: "automation_flow",
  DEVICE_CONFIG: "device_config",
} as const;

export type IndustrialDocumentType =
  (typeof IndustrialDocumentType)[keyof typeof IndustrialDocumentType];

export const ConnectionStateSchema = z.enum([
  "disconnected",
  "connecting",
  "connected",
  "reconnecting",
  "error",
]);

export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

export const AdapterMetricsSchema = z.object({
  messagesReceived: z.number(),
  messagesProcessed: z.number(),
  messagesDropped: z.number(),
  lastMessageAt: z.number(),
  connectionUptime: z.number(),
  reconnectCount: z.number(),
  errorCount: z.number(),
});

export type AdapterMetrics = z.infer<typeof AdapterMetricsSchema>;

export const CertificateStoreSchema = z.object({
  connectorId: z.string(),
  protocol: z.enum(["opcua", "mqtt", "bacnet_sc"]),
  applicationCert: z.string().optional(),
  applicationKey: z.string().optional(),
  caCertificates: z.array(z.string()).optional(),
  trustedCertificates: z.array(z.string()).optional(),
  issuedAt: z.number(),
  expiresAt: z.number(),
  renewalThresholdDays: z.number().default(30),
});

export type CertificateStore = z.infer<typeof CertificateStoreSchema>;
