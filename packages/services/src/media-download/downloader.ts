import type { BotPlatform, MessageAttachment } from "@openbeam/types/bot";

interface PlatformCredentials {
  accessToken?: string;
  botToken?: string;
  phoneNumberId?: string;
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
      return await downloadPublic(attachment.url ?? "");
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
  if (!(mediaId && credentials.accessToken)) {
    throw new Error("WhatsApp media download requires mediaId and accessToken");
  }

  const metaRes = await fetchWithTimeout(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${credentials.accessToken}` } }
  );
  const meta = (await metaRes.json()) as { url?: string };
  if (!meta.url) {
    throw new Error("WhatsApp media URL not found");
  }

  return downloadWithAuth(meta.url, credentials.accessToken);
}

async function downloadTelegram(
  attachment: MessageAttachment,
  credentials: PlatformCredentials
): Promise<Buffer> {
  const fileId = attachment.platformMediaId;
  if (!(fileId && credentials.botToken)) {
    throw new Error("Telegram download requires fileId and botToken");
  }

  const fileRes = await fetchWithTimeout(
    `https://api.telegram.org/bot${credentials.botToken}/getFile?file_id=${fileId}`
  );
  const fileData = (await fileRes.json()) as {
    result?: { file_path?: string };
  };
  const filePath = fileData.result?.file_path;
  if (!filePath) {
    throw new Error("Telegram file path not found");
  }

  return downloadPublic(
    `https://api.telegram.org/file/bot${credentials.botToken}/${filePath}`
  );
}

async function downloadWithAuth(url: string, token?: string): Promise<Buffer> {
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

  const res = await fetchWithTimeout(url, { headers });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_DOWNLOAD_SIZE) {
    throw new Error(
      `File too large: ${contentLength} bytes (max ${MAX_DOWNLOAD_SIZE})`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
