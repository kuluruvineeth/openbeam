import { getRedisClient } from "@openbeam/redis";
import { downloadMedia, ragAnswer } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import { env } from "../env";
import type { ResolvedIdentity } from "../identity/resolver";

const DOC_CONTEXT_TTL = 1800;
const MAX_CONTEXT_CHARS = 50_000;

export async function handleDocumentUpload(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const attachment = message.attachments?.[0];
  if (!attachment?.platformMediaId) {
    return { type: "error", text: "No document attachment found." };
  }

  const credentials = getPlatformCredentials(message.platform);
  const buffer = await downloadMedia(attachment, message.platform, credentials);

  const parsedText = await parseDocument(buffer, attachment.mimeType);
  if (!parsedText) {
    return {
      type: "text",
      text: "I couldn't read that document. Make sure it's a supported format (PDF, DOCX, TXT, etc.).",
    };
  }

  const contextKey = docContextKey(identity.teamId, identity.userId);
  const redis = await getRedisClient();
  await redis.set(contextKey, parsedText.slice(0, MAX_CONTEXT_CHARS), {
    EX: DOC_CONTEXT_TTL,
  });

  const docName = attachment.name ?? "document";
  const pageEstimate = Math.ceil(parsedText.length / 3000);

  if (message.text) {
    const result = await ragAnswer({
      query: message.text,
      teamId: identity.teamId,
      systemPrompt: `Use this document as context:\n\n${parsedText.slice(0, 20_000)}`,
    });
    return {
      type: "answer",
      text: result.answer,
      title: message.text,
      confidence: result.confidence,
      responseId: crypto.randomUUID(),
    };
  }

  return {
    type: "text",
    text: `I've read "${docName}" (~${pageEstimate} pages). What would you like to know about it?`,
    responseId: crypto.randomUUID(),
    followUps: ["Summarize this document", "What are the key points?"],
  };
}

export async function getDocumentContext(
  teamId: string,
  userId: string
): Promise<string | null> {
  const redis = await getRedisClient();
  return redis.get(docContextKey(teamId, userId));
}

function docContextKey(teamId: string, userId: string): string {
  return `bot:docctx:${teamId}:${userId}`;
}

async function parseDocument(
  buffer: Buffer,
  mimeType?: string
): Promise<string | null> {
  const engineUrl = process.env.ENGINE_URL ?? "http://localhost:8000";
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([buffer], { type: mimeType ?? "application/octet-stream" }),
    "upload"
  );

  try {
    const res = await fetch(`${engineUrl}/v1/parse`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { text?: string; content?: string };
    return data.text ?? data.content ?? null;
  } catch {
    return null;
  }
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
