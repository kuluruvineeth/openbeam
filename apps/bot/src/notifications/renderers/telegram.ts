import type { NotificationEventType } from "@openbeam/types/bot";
import type { InlineKeyboardButton, InlineKeyboardMarkup } from "grammy/types";
import { truncate } from "../../renderers/shared";
import {
  buildNotificationBody,
  getNotificationContent,
  type NotificationContent,
} from "../content";

interface TelegramNotificationPayload {
  text: string;
  parse_mode: "HTML";
  reply_markup?: InlineKeyboardMarkup;
}

const SEVERITY_ICON: Record<NotificationContent["severity"], string> = {
  critical: "\u{1F6A8}",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
  success: "\u2705",
};

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderTelegramNotification(
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): TelegramNotificationPayload {
  const content = getNotificationContent(eventType);
  const body = buildNotificationBody(eventType, payload);
  const icon = SEVERITY_ICON[content.severity];
  const url = payload.url as string | undefined;

  const text = truncate(
    `${icon} <b>${esc(content.title)}</b>\n\n${esc(body)}`,
    4096
  );

  const buttons: InlineKeyboardButton[][] = [];
  if (url) {
    buttons.push([{ text: "View Details", url }]);
  }

  return {
    text,
    parse_mode: "HTML",
    ...(buttons.length > 0 && {
      reply_markup: { inline_keyboard: buttons },
    }),
  };
}
