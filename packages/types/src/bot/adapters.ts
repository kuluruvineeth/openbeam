import type { BotResponse, UnifiedMessage } from "./messages";
import type { BotPlatform, PlatformConfig } from "./platforms";

export interface ProactiveTarget {
  platformUserId: string;
  platformTeamId: string;
  teamId: string;
}

export interface PlatformAdapter {
  readonly platform: BotPlatform;
  readonly config: PlatformConfig;
  parseEvent(
    rawBody: unknown,
    headers: Record<string, string>
  ): Promise<UnifiedMessage | null>;
  verifySignature(
    rawBody: string,
    headers: Record<string, string>
  ): boolean | Promise<boolean>;
  sendResponse(message: UnifiedMessage, response: BotResponse): Promise<void>;
  sendTypingIndicator(
    channelId: string,
    threadId?: string,
    messageId?: string
  ): Promise<void>;
  sendProactive(
    target: ProactiveTarget,
    response: BotResponse
  ): Promise<boolean>;
}
