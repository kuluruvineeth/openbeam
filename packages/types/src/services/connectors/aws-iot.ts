import { z } from "zod";

export const AWS_IOT_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-northeast-1",
  "ap-southeast-1",
  "ap-southeast-2",
] as const;

export type AwsIotRegion = (typeof AWS_IOT_REGIONS)[number];

export interface AwsIotClientConfig {
  connectorId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: AwsIotRegion;
  timeout?: number;
}

export interface AwsIotSyncCursor {
  lastSyncTime?: number;
  thingsToken?: string;
  thingGroupsToken?: string;
}

export interface AwsIotTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  region: AwsIotRegion;
  accountId?: string;
}

export interface AwsIotSyncBatch<T> {
  items: T[];
  cursor: AwsIotSyncCursor;
  stage: string;
  hasMore: boolean;
}

export const AwsIotSyncOptionsSchema = z.object({
  pageSize: z.number().min(1).max(250).default(250),
  syncThingGroups: z.boolean().default(true),
  syncShadows: z.boolean().default(true),
});

export type AwsIotSyncOptions = z.infer<typeof AwsIotSyncOptionsSchema>;
