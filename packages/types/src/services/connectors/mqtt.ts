import { z } from "zod";

export const MqttConnectionConfigSchema = z.object({
  connectorId: z.string(),
  brokerUrl: z.string(),
  protocol: z.enum(["mqtt", "mqtts", "ws", "wss"]).default("mqtts"),
  port: z.number(),
  clientId: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  caFile: z.string().optional(),
  certFile: z.string().optional(),
  keyFile: z.string().optional(),
  mqttVersion: z.enum(["3.1.1", "5.0"]).default("5.0"),
  cleanStart: z.boolean().default(true),
  sessionExpiryInterval: z.number().default(3600),
  keepAlive: z.number().default(60),
  reconnectPeriod: z.number().default(5000),
  connectTimeout: z.number().default(30_000),
});

export type MqttConnectionConfig = z.infer<typeof MqttConnectionConfigSchema>;

export const MqttSubscriptionSchema = z.object({
  topic: z.string(),
  qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(1),
  payloadFormat: z.enum(["json", "sparkplug_b", "raw", "cbor"]).default("json"),
  aggregationWindow: z.number().optional(),
  topicParser: z.string().optional(),
});

export type MqttSubscription = z.infer<typeof MqttSubscriptionSchema>;

export const MqttSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  subscribedTopics: z.array(z.string()).optional(),
  lastMessageTimestamp: z.number().optional(),
});

export type MqttSyncCursor = z.infer<typeof MqttSyncCursorSchema>;

export interface MqttSyncOptions {
  cursor?: MqttSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  subscriptions?: MqttSubscription[];
}

export interface MqttTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  brokerUrl: string;
}

export interface MqttClientConfig {
  connectorId: string;
  connection: MqttConnectionConfig;
  subscriptions: MqttSubscription[];
  timeout?: number;
}

export const SparkplugMessageType = {
  NBIRTH: "NBIRTH",
  NDEATH: "NDEATH",
  DBIRTH: "DBIRTH",
  DDEATH: "DDEATH",
  NDATA: "NDATA",
  DDATA: "DDATA",
  NCMD: "NCMD",
  DCMD: "DCMD",
  STATE: "STATE",
} as const;

export type SparkplugMessageType =
  (typeof SparkplugMessageType)[keyof typeof SparkplugMessageType];

export interface SparkplugMetric {
  name?: string;
  alias?: number;
  timestamp?: number;
  datatype?: number;
  isHistorical?: boolean;
  isTransient?: boolean;
  isNull?: boolean;
  value: unknown;
}

export interface SparkplugPayload {
  timestamp: number;
  seq: number;
  metrics?: SparkplugMetric[];
}

export interface SparkplugTopicParts {
  namespace: string;
  groupId: string;
  messageType: SparkplugMessageType;
  edgeNodeId: string;
  deviceId?: string;
}

export interface InternalMessage {
  connectorId: string;
  protocol: string;
  topic: string;
  payload: Record<string, unknown>;
  timestamp: number;
  qos: number;
  retain: boolean;
}
