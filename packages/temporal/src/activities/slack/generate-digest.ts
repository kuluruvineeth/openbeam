import { generateDailyDigest } from "@openplane/services";
import type { DigestGenerationInput, DigestGenerationOutput } from "./types";

export async function generateDigest(
  input: DigestGenerationInput
): Promise<DigestGenerationOutput> {
  const {
    connector,
    userId,
    slackUserId,
    teamId,
    channelIds,
    topics,
    frequency,
  } = input;

  const accessControlIds = [userId, `team:${teamId}`];

  const digestContent = await generateDailyDigest({
    userId,
    slackUserId,
    teamId,
    connectorId: connector.id,
    channelIds,
    topics,
    deliveryTime: "",
    timezone: "UTC",
    frequency,
    accessControlIds,
  });

  if (!digestContent) {
    return {
      content: null,
      skipped: true,
      reason: "No content available for digest",
    };
  }

  return {
    content: {
      summary: digestContent.summary,
      messageCount: digestContent.messageCount,
      channelCount: digestContent.channelCount,
    },
    skipped: false,
  };
}
