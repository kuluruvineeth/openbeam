import type {
  Prisma,
  SlackAssistantFeedback,
  SlackChannelConfig,
  SlackDigestSubscription,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface UpsertSlackChannelConfigInput {
  connectorId: string;
  channelId: string;
  channelName?: string;
  responseMode?: string;
  reactionsEnabled?: boolean;
  respondToWorkflows?: boolean;
  configuredBy?: string;
}

export const upsertSlackChannelConfig = async (
  db: Database,
  data: UpsertSlackChannelConfigInput
): Promise<SlackChannelConfig> =>
  db.slackChannelConfig.upsert({
    where: {
      connectorId_channelId: {
        connectorId: data.connectorId,
        channelId: data.channelId,
      },
    },
    create: {
      ...data,
      configuredAt: new Date(),
    },
    update: {
      channelName: data.channelName,
      responseMode: data.responseMode,
      reactionsEnabled: data.reactionsEnabled,
      respondToWorkflows: data.respondToWorkflows,
      configuredBy: data.configuredBy,
      configuredAt: new Date(),
    },
  });

export const deleteSlackChannelConfig = async (
  db: Database,
  connectorId: string,
  channelId: string
): Promise<SlackChannelConfig> =>
  db.slackChannelConfig.delete({
    where: { connectorId_channelId: { connectorId, channelId } },
  });

export interface UpsertSlackDigestInput {
  connectorId: string;
  userId: string;
  slackUserId: string;
  channelIds?: string[];
  topics?: string[];
  deliveryTime?: string;
  timezone?: string;
  frequency?: string;
  enabled?: boolean;
}

export const upsertSlackDigestSubscription = async (
  db: Database,
  data: UpsertSlackDigestInput
): Promise<SlackDigestSubscription> =>
  db.slackDigestSubscription.upsert({
    where: {
      connectorId_slackUserId: {
        connectorId: data.connectorId,
        slackUserId: data.slackUserId,
      },
    },
    create: data,
    update: {
      userId: data.userId,
      channelIds: data.channelIds,
      topics: data.topics,
      deliveryTime: data.deliveryTime,
      timezone: data.timezone,
      frequency: data.frequency,
      enabled: data.enabled,
    },
  });

export const updateDigestDelivery = async (
  db: Database,
  id: string,
  error?: string
): Promise<SlackDigestSubscription> =>
  db.slackDigestSubscription.update({
    where: { id },
    data: {
      lastDeliveredAt: new Date(),
      deliveryCount: { increment: 1 },
      lastError: error ?? null,
    },
  });

export interface CreateSlackFeedbackInput {
  connectorId: string;
  userId: string;
  channelId: string;
  messageTs: string;
  query: string;
  response: string;
  feedbackType: string;
  citations?: Prisma.InputJsonValue;
  latencyMs?: number;
}

export const createSlackFeedback = async (
  db: Database,
  data: CreateSlackFeedbackInput
): Promise<SlackAssistantFeedback> =>
  db.slackAssistantFeedback.create({ data });
