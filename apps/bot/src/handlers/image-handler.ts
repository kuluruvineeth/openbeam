import { downloadMedia, ragAnswer } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import { env } from "../env";
import type { ResolvedIdentity } from "../identity/resolver";

const IMAGE_ANALYSIS_PROMPT = [
  "You are OpenBeam, an enterprise search assistant. The user sent an image.",
  "Analyze it concisely. If it's a screenshot of an error, diagnose the issue.",
  "If it's a chart, summarize the data trends. If it's a document, extract key text.",
  "Keep your response under 200 words.",
].join("\n");

export async function handleImageMessage(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const attachment = message.attachments?.[0];
  if (!attachment?.platformMediaId) {
    return { type: "error", text: "No image attachment found." };
  }

  const credentials = getPlatformCredentials(message.platform);
  await downloadMedia(attachment, message.platform, credentials);

  const question = message.text || "What's in this image?";

  const result = await ragAnswer({
    query: question,
    teamId: identity.teamId,
    systemPrompt: IMAGE_ANALYSIS_PROMPT,
  });

  return {
    type: "answer",
    text:
      result.answer ||
      "I analyzed the image but couldn't generate a description.",
    title: question,
    confidence: result.confidence,
    responseId: crypto.randomUUID(),
    followUps: ["Tell me more about this", "Extract text from the image"],
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
