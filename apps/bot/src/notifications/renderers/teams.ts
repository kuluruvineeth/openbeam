import type { NotificationEventType } from "@openbeam/types/bot";
import { truncate } from "../../renderers/shared";
import {
  buildNotificationBody,
  getNotificationContent,
  type NotificationContent,
} from "../content";

type CardElement = Record<string, unknown>;

interface TeamsNotificationPayload {
  type: "message";
  attachments: Array<{
    contentType: string;
    content: {
      type: "AdaptiveCard";
      version: "1.5";
      body: CardElement[];
      actions?: CardElement[];
    };
  }>;
}

const SEVERITY_COLOR: Record<NotificationContent["severity"], string> = {
  critical: "attention",
  warning: "warning",
  info: "accent",
  success: "good",
};

export function renderTeamsNotification(
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): TeamsNotificationPayload {
  const content = getNotificationContent(eventType);
  const body = buildNotificationBody(eventType, payload);
  const color = SEVERITY_COLOR[content.severity];
  const url = payload.url as string | undefined;

  const cardBody: CardElement[] = [
    {
      type: "TextBlock",
      text: truncate(content.title, 150),
      weight: "bolder",
      size: "medium",
      color,
    },
    {
      type: "TextBlock",
      text: truncate(body, 500),
      wrap: true,
    },
  ];

  const actions: CardElement[] = [];
  if (url) {
    actions.push({ type: "Action.OpenUrl", title: "View Details", url });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          type: "AdaptiveCard",
          version: "1.5",
          body: cardBody,
          ...(actions.length > 0 && { actions }),
        },
      },
    ],
  };
}
