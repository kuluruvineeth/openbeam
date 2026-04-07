import { randomBytes } from "node:crypto";
import type { Database } from "@openbeam/db";
import { createBotLinkRequest } from "@openbeam/db";
import type {
  BotResponse,
  PlatformAdapter,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { env } from "../env";

const LINK_TOKEN_BYTES = 32;
const LINK_EXPIRY_MS = 15 * 60 * 1000;

export async function createLinkToken(
  db: Database,
  message: UnifiedMessage
): Promise<string> {
  const token = randomBytes(LINK_TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_MS);

  await createBotLinkRequest(db, {
    platform: message.platform,
    platformUserId: message.platformUserId,
    platformTeamId: message.platformTeamId,
    token,
    expiresAt,
  });

  return token;
}

export function buildLinkUrl(token: string): string {
  return `${env.BOT_LINK_BASE_URL}/bot/link?token=${token}`;
}

export async function sendLinkPrompt(
  db: Database,
  adapter: PlatformAdapter,
  message: UnifiedMessage
): Promise<void> {
  const token = await createLinkToken(db, message);
  const url = buildLinkUrl(token);

  const response: BotResponse = {
    type: "link_prompt",
    text: "Link your account to use OpenBeam. Click the button below to connect.",
    buttons: [
      {
        label: "Link Account",
        action: "link",
        value: url,
        style: "primary",
      },
    ],
    ephemeral: true,
  };

  await adapter.sendResponse(message, response);
}
