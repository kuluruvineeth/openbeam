import type { NotificationEventType } from "@openbeam/types/bot";
import { truncate } from "../../renderers/shared";
import {
  buildNotificationBody,
  getNotificationContent,
  type NotificationContent,
} from "../content";

type Payload = Record<string, unknown>;

const MAX_BODY = 1024;

const SEVERITY_ICON: Record<NotificationContent["severity"], string> = {
  critical: "\u{1F6A8}",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
  success: "\u2705",
};

export function renderWhatsAppNotification(
  to: string,
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): Payload {
  const content = getNotificationContent(eventType);
  const body = buildNotificationBody(eventType, payload);
  const icon = SEVERITY_ICON[content.severity];
  const text = truncate(`${icon} *${content.title}*\n\n${body}`, MAX_BODY);
  const url = payload.url as string | undefined;

  if (url) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: { text },
        action: {
          name: "cta_url",
          parameters: { display_text: "View Details", url },
        },
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  };
}
