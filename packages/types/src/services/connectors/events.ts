import type { ConnectorEventConfig, EventCategory } from "./common/events";
import { GITHUB_EVENTS, type GitHubEventId } from "./github/events";
import { GMAIL_EVENTS, type GmailEventId } from "./gmail/events";
import {
  GOOGLE_DRIVE_EVENTS,
  type GoogleDriveEventId,
} from "./google-drive/events";
import { LINEAR_EVENTS, type LinearEventId } from "./linear/events";
import { NOTION_EVENTS, type NotionEventId } from "./notion/events";
import { SLACK_EVENTS, type SlackEventId } from "./slack/events";

export type {
  ConnectorEventConfig,
  EventCategory,
} from "./common/events";

export {
  ConnectorEventConfigSchema,
  defineConnectorEvents,
} from "./common/events";

export type ConnectorType =
  | "slack"
  | "linear"
  | "notion"
  | "gmail"
  | "google-drive"
  | "github";

export type ConnectorEventId =
  | SlackEventId
  | LinearEventId
  | NotionEventId
  | GmailEventId
  | GoogleDriveEventId
  | GitHubEventId;

export type ConnectorEventIdMap = {
  slack: SlackEventId;
  linear: LinearEventId;
  notion: NotionEventId;
  gmail: GmailEventId;
  "google-drive": GoogleDriveEventId;
  github: GitHubEventId;
};

export const CONNECTOR_EVENTS: Record<
  ConnectorType,
  readonly ConnectorEventConfig[]
> = {
  slack: SLACK_EVENTS,
  linear: LINEAR_EVENTS,
  notion: NOTION_EVENTS,
  gmail: GMAIL_EVENTS,
  "google-drive": GOOGLE_DRIVE_EVENTS,
  github: GITHUB_EVENTS,
} as const;

export const CONNECTOR_TYPES = Object.keys(CONNECTOR_EVENTS) as ConnectorType[];

export function isConnectorType(value: string): value is ConnectorType {
  return CONNECTOR_TYPES.includes(value as ConnectorType);
}

export function normalizeToConnectorType(
  appType: string
): ConnectorType | undefined {
  const normalized = appType.toLowerCase().replace(/_/g, "-");
  return isConnectorType(normalized) ? normalized : undefined;
}

export function getConnectorEvents(
  connectorType: ConnectorType
): readonly ConnectorEventConfig[] {
  return CONNECTOR_EVENTS[connectorType] ?? [];
}

export function getConnectorEvent(
  connectorType: ConnectorType,
  eventId: string
): ConnectorEventConfig | undefined {
  const events = getConnectorEvents(connectorType);
  return events.find((e) => e.id === eventId);
}

export function getEventsByCategory(
  connectorType: ConnectorType,
  category: EventCategory
): readonly ConnectorEventConfig[] {
  const events = getConnectorEvents(connectorType);
  return events.filter((e) => e.category === category);
}

export function getAllEventCategories(
  connectorType: ConnectorType
): EventCategory[] {
  const events = getConnectorEvents(connectorType);
  const categories = new Set(events.map((e) => e.category));
  return [...categories];
}

export {
  GITHUB_EVENT_IDS,
  GITHUB_EVENTS,
  type GitHubEventId,
  GitHubEventIdSchema,
} from "./github/events";
export {
  GMAIL_EVENT_IDS,
  GMAIL_EVENTS,
  type GmailEventId,
  GmailEventIdSchema,
} from "./gmail/events";

export {
  GOOGLE_DRIVE_EVENT_IDS,
  GOOGLE_DRIVE_EVENTS,
  type GoogleDriveEventId,
  GoogleDriveEventIdSchema,
} from "./google-drive/events";

export {
  LINEAR_EVENT_IDS,
  LINEAR_EVENTS,
  type LinearEventId,
  LinearEventIdSchema,
} from "./linear/events";

export {
  NOTION_EVENT_IDS,
  NOTION_EVENTS,
  type NotionEventId,
  NotionEventIdSchema,
} from "./notion/events";

export {
  SLACK_EVENT_IDS,
  SLACK_EVENTS,
  type SlackEventId,
  SlackEventIdSchema,
} from "./slack/events";
