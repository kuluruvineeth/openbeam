import type { NotificationEventType } from "@openbeam/types/bot";
import { truncate } from "../../renderers/shared";
import {
  buildNotificationBody,
  getNotificationContent,
  type NotificationContent,
} from "../content";

interface Embed {
  color: number;
  title: string;
  description: string;
  footer?: { text: string };
  url?: string;
}

interface Component {
  type: number;
  components?: Record<string, unknown>[];
}

interface DiscordNotificationPayload {
  embeds: Embed[];
  components: Component[];
}

const SEVERITY_COLOR: Record<NotificationContent["severity"], number> = {
  critical: 0xed_42_45,
  warning: 0xf5_a6_23,
  info: 0x34_98_db,
  success: 0x57_f2_87,
};

export function renderDiscordNotification(
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): DiscordNotificationPayload {
  const content = getNotificationContent(eventType);
  const body = buildNotificationBody(eventType, payload);
  const url = payload.url as string | undefined;

  const embed: Embed = {
    color: SEVERITY_COLOR[content.severity],
    title: truncate(content.title, 256),
    description: truncate(body, 4096),
    footer: { text: "OpenBeam Notification" },
    ...(url && { url }),
  };

  const components: Component[] = [];
  if (url) {
    components.push({
      type: 1,
      components: [{ type: 2, style: 5, label: "View Details", url }],
    });
  }

  return { embeds: [embed], components };
}
