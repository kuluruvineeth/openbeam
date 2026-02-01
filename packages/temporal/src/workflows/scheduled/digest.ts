import {
  DigestDeliveryInputSchema,
  type DigestDeliveryOutput,
} from "@openplane/types/temporal/workflows";
import { proxyActivities } from "@temporalio/workflow";
import type { DatabaseActivities } from "../../activities/database/types";
import type { SlackDigestActivities } from "../../activities/slack/types";

const databaseActivities = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: "30s",
  retry: { maximumAttempts: 3 },
});

const slackActivities = proxyActivities<SlackDigestActivities>({
  startToCloseTimeout: "2m",
  retry: {
    initialInterval: "5s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["AuthorizationError"],
  },
});

export async function digestDeliveryWorkflow(
  rawInput: unknown
): Promise<DigestDeliveryOutput> {
  const input = DigestDeliveryInputSchema.parse(rawInput);
  const {
    subscriptionId,
    connectorId,
    userId,
    slackUserId,
    teamId,
    channelIds,
    topics,
    frequency,
  } = input;

  const connector = await databaseActivities.loadConnector(connectorId);

  const generationResult = await slackActivities.generateDigest({
    connector,
    userId,
    slackUserId,
    teamId,
    channelIds,
    topics,
    frequency,
  });

  if (generationResult.skipped || !generationResult.content) {
    await slackActivities.updateDigestRecord({ subscriptionId });

    return {
      subscriptionId,
      delivered: false,
      error: generationResult.reason ?? "No content",
    };
  }

  const deliveryResult = await slackActivities.deliverDigest({
    connector,
    slackUserId,
    content: generationResult.content,
    frequency,
  });

  await slackActivities.updateDigestRecord({
    subscriptionId,
    error: deliveryResult.error,
  });

  return {
    subscriptionId,
    delivered: deliveryResult.delivered,
    messageTs: deliveryResult.messageTs,
    error: deliveryResult.error,
  };
}
