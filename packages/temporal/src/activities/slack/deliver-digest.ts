import { buildDigestBlocks, createSlackClient } from "@openplane/services";
import type {
  DigestDeliveryActivityInput,
  DigestDeliveryActivityOutput,
} from "./types";

export async function deliverDigest(
  input: DigestDeliveryActivityInput
): Promise<DigestDeliveryActivityOutput> {
  const { connector, slackUserId, content, frequency } = input;

  if (!connector.oauthProvider) {
    return {
      delivered: false,
      error: "No OAuth credentials for connector",
    };
  }

  const client = createSlackClient({
    token: connector.oauthProvider.accessToken,
    connectorId: connector.id,
  });

  const digestContent = {
    summary: content.summary,
    highlights: [],
    messageCount: content.messageCount,
    channelCount: content.channelCount,
    generatedAt: new Date(),
  };

  const blocks = buildDigestBlocks(digestContent, frequency);

  const response = (await client.call("chat.postMessage", {
    channel: slackUserId,
    blocks,
    text: `Your ${frequency} digest is ready`,
  })) as { ts?: string; ok?: boolean; error?: string };

  if (!response.ok) {
    return {
      delivered: false,
      error: response.error ?? "Failed to send message",
    };
  }

  return {
    delivered: true,
    messageTs: response.ts,
  };
}
