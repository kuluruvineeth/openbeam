import { z } from "zod";

export const OpcUaSecurityConfigSchema = z.object({
  securityMode: z
    .enum(["None", "Sign", "SignAndEncrypt"])
    .default("SignAndEncrypt"),
  securityPolicy: z
    .enum([
      "None",
      "Basic256",
      "Basic256Sha256",
      "Aes128_Sha256_RsaOaep",
      "Aes256_Sha256_RsaPss",
    ])
    .default("Basic256Sha256"),
  certificatePem: z.string().optional(),
  privateKeyPem: z.string().optional(),
  trustedCertificatesPem: z.array(z.string()).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export type OpcUaSecurityConfig = z.infer<typeof OpcUaSecurityConfigSchema>;

export const OpcUaConnectionConfigSchema = z.object({
  connectorId: z.string(),
  endpointUrl: z.string(),
  security: OpcUaSecurityConfigSchema.optional(),
  applicationName: z.string().default("OpenBeam Gateway"),
  keepAliveInterval: z.number().default(10_000),
  connectionTimeout: z.number().default(30_000),
  requestTimeout: z.number().default(60_000),
});

export type OpcUaConnectionConfig = z.infer<typeof OpcUaConnectionConfigSchema>;

export const OpcUaSubscriptionConfigSchema = z.object({
  nodeId: z.string(),
  samplingInterval: z.number().default(1000),
  queueSize: z.number().default(10),
  discardOldest: z.boolean().default(true),
});

export type OpcUaSubscriptionConfig = z.infer<
  typeof OpcUaSubscriptionConfigSchema
>;

export const OpcUaSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastBrowseTime: z.number().optional(),
  browsedNodeIds: z.array(z.string()).optional(),
  subscribedNodeIds: z.array(z.string()).optional(),
});

export type OpcUaSyncCursor = z.infer<typeof OpcUaSyncCursorSchema>;

export interface OpcUaSyncOptions {
  cursor?: OpcUaSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  maxBrowseDepth?: number;
  rootNodeId?: string;
  subscriptionInterval?: number;
}

export interface OpcUaTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  endpointUrl: string;
  companionSpec?: string;
}

export interface OpcUaNode {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: number;
  typeDefinition?: string;
  value?: unknown;
  dataType?: string;
  engineeringUnits?: string;
  description?: string;
}

export interface OpcUaDataChange {
  nodeId: string;
  value: unknown;
  dataType: string;
  statusCode: number;
  sourceTimestamp: number;
  serverTimestamp: number;
}

export const OpcUaCompanionSpec = {
  MTCONNECT: "mtconnect",
  PLCOPEN: "plcopen",
  PACKML: "packml",
  EUROMAP: "euromap",
  AUTOID: "autoid",
  MDIS: "mdis",
} as const;

export type OpcUaCompanionSpec =
  (typeof OpcUaCompanionSpec)[keyof typeof OpcUaCompanionSpec];

export interface OpcUaSyncBatch<T> {
  items: T[];
  cursor: OpcUaSyncCursor;
  stage: string;
  hasMore: boolean;
}
