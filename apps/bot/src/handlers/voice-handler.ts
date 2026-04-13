import { downloadMedia, transcribeVoiceNote } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import { env } from "../env";
import type { ResolvedIdentity } from "../identity/resolver";
import { routeMessage } from "./router";

export async function handleVoiceMessage(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const attachment = message.attachments?.[0];
  if (!attachment?.platformMediaId) {
    return { type: "error", text: "No audio attachment found." };
  }

  const credentials = getPlatformCredentials(message.platform);
  const buffer = await downloadMedia(attachment, message.platform, credentials);

  const result = await transcribeVoiceNote(buffer, attachment.mimeType, {
    duration: attachment.duration,
  });

  if (!result.text) {
    return {
      type: "text",
      text: "I couldn't transcribe that audio. Try sending a text message.",
    };
  }

  const syntheticMessage: UnifiedMessage = {
    ...message,
    text: result.text,
    attachments: undefined,
  };

  const response = await routeMessage(syntheticMessage, identity);

  return {
    ...response,
    text: `\u{1F3A4} I heard: "${result.text}"\n\n${response.text}`,
  };
}

function getPlatformCredentials(platform: string) {
  switch (platform) {
    case "WHATSAPP":
      return { accessToken: env.WHATSAPP_ACCESS_TOKEN };
    case "TELEGRAM":
      return { botToken: env.TELEGRAM_BOT_TOKEN };
    case "SLACK":
      return { botToken: env.SLACK_BOT_TOKEN };
    default:
      return {};
  }
}
