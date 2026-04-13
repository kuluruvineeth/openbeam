import type { BotPlatform, MessageAttachment } from "@openbeam/types/bot";
import { createTelegramClient } from "../telegram/client";
import { createWhatsAppClient } from "../whatsapp/client";

interface PlatformCredentials {
  accessToken?: string;
  botToken?: string;
  phoneNumberId?: string;
  connectorId?: string;
}

const MAX_DOWNLOAD_SIZE = 25 * 1024 * 1024;
const DOWNLOAD_TIMEOUT = 30_000;

export async function downloadMedia(
  attachment: MessageAttachment,
  platform: BotPlatform,
  credentials: PlatformCredentials
): Promise<Buffer> {
  switch (platform) {
    case "WHATSAPP":
      return await downloadWhatsApp(attachment, credentials);
    case "TELEGRAM":
      return await downloadTelegram(attachment, credentials);
    case "SLACK":
      return await downloadWithAuth(attachment.url ?? "", credentials.botToken);
    case "DISCORD":
    case "TEAMS":
      return await downloadPublic(attachment.url ?? "");
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function downloadWhatsApp(
  attachment: MessageAttachment,
  credentials: PlatformCredentials
): Promise<Buffer> {
  const mediaId = attachment.platformMediaId;
  if (!(mediaId && credentials.accessToken && credentials.phoneNumberId)) {
    throw new Error(
      "WhatsApp download requires platformMediaId, accessToken, and phoneNumberId"
    );
  }

  const client = createWhatsAppClient({
    phoneNumberId: credentials.phoneNumberId,
    accessToken: credentials.accessToken,
    connectorId: credentials.connectorId ?? "bot_whatsapp",
  });

  return await client.downloadMedia(mediaId);
}

async function downloadTelegram(
  attachment: MessageAttachment,
  credentials: PlatformCredentials
): Promise<Buffer> {
  const fileId = attachment.platformMediaId;
  if (!(fileId && credentials.botToken)) {
    throw new Error("Telegram download requires platformMediaId and botToken");
  }

  const client = createTelegramClient({
    botToken: credentials.botToken,
    connectorId: credentials.connectorId ?? "bot_telegram",
  });

  return await client.downloadFile(fileId);
}

async function downloadWithAuth(url: string, token?: string): Promise<Buffer> {
  if (!url) {
    throw new Error("Download URL is empty");
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return await downloadPublic(url, headers);
}

async function downloadPublic(
  url: string,
  headers?: Record<string, string>
): Promise<Buffer> {
  if (!url) {
    throw new Error("Download URL is empty");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MAX_DOWNLOAD_SIZE) {
      throw new Error(
        `File too large: ${contentLength} bytes (max ${MAX_DOWNLOAD_SIZE})`
      );
    }

    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}
