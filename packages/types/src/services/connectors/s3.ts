import { z } from "zod";

export const S3_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-north-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-south-1",
  "sa-east-1",
  "ca-central-1",
  "me-south-1",
  "af-south-1",
] as const;

export type S3Region = (typeof S3_REGIONS)[number];

export interface S3ClientConfig {
  connectorId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: S3Region;
  bucketName: string;
  timeout?: number;
}

export interface S3SyncCursor {
  lastSyncTime?: number;
  continuationToken?: string;
}

export interface S3TransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  region: S3Region;
  bucketName: string;
}

export interface S3SyncBatch<T> {
  items: T[];
  cursor: S3SyncCursor;
  stage: string;
  hasMore: boolean;
}

export const S3SyncOptionsSchema = z.object({
  pageSize: z.number().min(1).max(1000).default(1000),
  prefixFilter: z.string().default(""),
  excludePrefixes: z.array(z.string()).default([]),
  fileTypesFilter: z.array(z.string()).default([]),
  maxFileSizeMb: z.number().min(0).default(100),
  lookbackDays: z.number().min(0).default(0),
});

export type S3SyncOptions = z.infer<typeof S3SyncOptionsSchema>;
