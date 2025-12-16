import type {
  Connector,
  SlackAssistantFeedback,
  SlackChannelConfig,
  SlackDigestSubscription,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export type DigestSubscriptionWithConnector = SlackDigestSubscription & {
  connector: Connector;
};

export const findSlackChannelConfig = async (
  db: Database,
  connectorId: string,
  channelId: string
): Promise<SlackChannelConfig | null> =>
  db.slackChannelConfig.findUnique({
    where: { connectorId_channelId: { connectorId, channelId } },
  });

export const listSlackChannelConfigs = async (
  db: Database,
  connectorId: string
): Promise<SlackChannelConfig[]> =>
  db.slackChannelConfig.findMany({
    where: { connectorId },
  });

export const findSlackDigestSubscription = async (
  db: Database,
  connectorId: string,
  slackUserId: string
): Promise<SlackDigestSubscription | null> =>
  db.slackDigestSubscription.findUnique({
    where: { connectorId_slackUserId: { connectorId, slackUserId } },
  });

export const listActiveDigestSubscriptions = async (
  db: Database,
  deliveryTime: string
): Promise<DigestSubscriptionWithConnector[]> =>
  db.slackDigestSubscription.findMany({
    where: { enabled: true, deliveryTime },
    include: { connector: true },
  });

export const listAllEnabledDigestSubscriptions = async (
  db: Database
): Promise<DigestSubscriptionWithConnector[]> =>
  db.slackDigestSubscription.findMany({
    where: { enabled: true },
    include: { connector: true },
  });

export const listSlackFeedback = async (
  db: Database,
  connectorId: string,
  limit = 100
): Promise<SlackAssistantFeedback[]> =>
  db.slackAssistantFeedback.findMany({
    where: { connectorId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export type SlackConnectorResult = {
  id: string;
  config: unknown;
  teamId: string;
};

export const findSlackConnectorByTeamId = async (
  db: Database,
  slackTeamId: string
): Promise<SlackConnectorResult | null> =>
  db.connector.findFirst({
    where: {
      app: "SLACK",
      status: "ACTIVE",
      config: { path: ["teamId"], equals: slackTeamId },
    },
    select: { id: true, config: true, teamId: true },
  });
