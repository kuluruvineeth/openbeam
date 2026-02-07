import type { ConnectorRecord } from "../connectors/types";

export interface DigestGenerationInput {
  connector: ConnectorRecord;
  userId: string;
  slackUserId: string;
  teamId: string;
  channelIds: string[];
  topics: string[];
  frequency: "daily" | "weekly";
}

export interface DigestContent {
  summary: string;
  messageCount: number;
  channelCount: number;
}

export interface DigestGenerationOutput {
  content: DigestContent | null;
  skipped: boolean;
  reason?: string;
}

export interface DigestDeliveryActivityInput {
  connector: ConnectorRecord;
  slackUserId: string;
  content: DigestContent;
  frequency: "daily" | "weekly";
}

export interface DigestDeliveryActivityOutput {
  delivered: boolean;
  messageTs?: string;
  error?: string;
}

export interface UpdateDigestRecordInput {
  subscriptionId: string;
  error?: string;
}

export interface SlackDigestActivities {
  generateDigest(input: DigestGenerationInput): Promise<DigestGenerationOutput>;
  deliverDigest(
    input: DigestDeliveryActivityInput
  ): Promise<DigestDeliveryActivityOutput>;
  updateDigestRecord(input: UpdateDigestRecordInput): Promise<void>;
}
