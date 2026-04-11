import type { BotPlatform, NotificationEventType } from "@openbeam/types/bot";
import { getAdapter } from "../adapters";
import { renderDiscordNotification } from "./renderers/discord";
import { renderSlackNotification } from "./renderers/slack";
import { renderTeamsNotification } from "./renderers/teams";
import { renderTelegramNotification } from "./renderers/telegram";
import { renderWhatsAppNotification } from "./renderers/whatsapp";

interface DeliveryTarget {
  platformUserId: string;
  platformTeamId: string;
  teamId: string;
}

export function deliverNotification(
  platform: BotPlatform,
  target: DeliveryTarget,
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): Promise<boolean> {
  const adapter = getAdapter(platform);
  if (!adapter) {
    return Promise.resolve(false);
  }

  const response = buildBotResponse(platform, target, eventType, payload);
  return adapter.sendProactive(target, response);
}

function buildBotResponse(
  platform: BotPlatform,
  target: DeliveryTarget,
  eventType: NotificationEventType,
  payload: Record<string, unknown>
) {
  switch (platform) {
    case "SLACK": {
      const rendered = renderSlackNotification(eventType, payload);
      return {
        type: "action_result" as const,
        text: rendered.text,
        actionResult: {
          action: eventType,
          success: true,
          message: rendered.text,
        },
      };
    }
    case "DISCORD": {
      const rendered = renderDiscordNotification(eventType, payload);
      return {
        type: "action_result" as const,
        text: rendered.embeds[0]?.description ?? "",
        actionResult: {
          action: eventType,
          success: true,
          message: rendered.embeds[0]?.description ?? "",
        },
      };
    }
    case "TELEGRAM": {
      const rendered = renderTelegramNotification(eventType, payload);
      return {
        type: "action_result" as const,
        text: rendered.text,
        actionResult: {
          action: eventType,
          success: true,
          message: rendered.text,
        },
      };
    }
    case "WHATSAPP": {
      const rendered = renderWhatsAppNotification(
        target.platformUserId,
        eventType,
        payload
      );
      const text =
        (rendered.text as { body?: string })?.body ??
        (rendered.interactive as { body?: { text?: string } })?.body?.text ??
        "";
      return {
        type: "action_result" as const,
        text,
        actionResult: {
          action: eventType,
          success: true,
          message: text,
        },
      };
    }
    case "TEAMS": {
      const rendered = renderTeamsNotification(eventType, payload);
      const body = rendered.attachments[0]?.content.body ?? [];
      const text =
        body
          .map((b) => (b as { text?: string }).text ?? "")
          .filter(Boolean)
          .join(" ") || "";
      return {
        type: "action_result" as const,
        text,
        actionResult: {
          action: eventType,
          success: true,
          message: text,
        },
      };
    }
    default:
      return {
        type: "action_result" as const,
        text: "",
        actionResult: { action: eventType, success: true, message: "" },
      };
  }
}
