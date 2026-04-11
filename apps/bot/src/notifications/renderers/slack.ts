import type { NotificationEventType } from "@openbeam/types/bot";
import { truncate } from "../../renderers/shared";
import {
  buildNotificationBody,
  getNotificationContent,
  type NotificationContent,
} from "../content";

type Block = Record<string, unknown>;

interface SlackNotificationPayload {
  text: string;
  blocks: Block[];
}

const SEVERITY_EMOJI: Record<NotificationContent["severity"], string> = {
  critical: ":rotating_light:",
  warning: ":warning:",
  info: ":information_source:",
  success: ":white_check_mark:",
};

export function renderSlackNotification(
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): SlackNotificationPayload {
  const content = getNotificationContent(eventType);
  const body = buildNotificationBody(eventType, payload);
  const emoji = SEVERITY_EMOJI[content.severity];
  const url = payload.url as string | undefined;

  const blocks: Block[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncate(`${emoji} *${content.title}*\n${body}`, 3000),
      },
    },
  ];

  if (url) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Details", emoji: true },
          url,
          action_id: `notif_view_${eventType}`,
        },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `OpenBeam Notification · <${payload.settingsUrl ?? "#"}|Manage preferences>`,
      },
    ],
  });

  return { text: `${content.title}: ${body}`, blocks };
}
