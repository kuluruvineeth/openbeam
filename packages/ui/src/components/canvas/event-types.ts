"use client";

import type {
  ConnectorEventConfig,
  ConnectorType,
  EventCategory,
} from "@openbeam/types/services/connectors/events";
import {
  CONNECTOR_EVENTS,
  getAllEventCategories,
  getConnectorEvent,
  getConnectorEvents,
  getEventsByCategory,
} from "@openbeam/types/services/connectors/events";
import { Icons } from "../icons";

export type ConnectorIconMap = {
  [K in ConnectorType]: (typeof Icons)[keyof typeof Icons];
};

export const CONNECTOR_ICONS: ConnectorIconMap = {
  slack: Icons.Integrations,
  linear: Icons.Task,
  notion: Icons.Note,
  gmail: Icons.Mail,
  "google-drive": Icons.Folder,
  github: Icons.GitBranch,
};

export type EventCategoryIconMap = {
  [K in EventCategory]: (typeof Icons)[keyof typeof Icons];
};

export const EVENT_CATEGORY_ICONS: EventCategoryIconMap = {
  messages: Icons.MessageSquare,
  channels: Icons.Users,
  reactions: Icons.Heart,
  files: Icons.FileIcon,
  users: Icons.User,
  issues: Icons.Alert02,
  projects: Icons.Folder,
  documents: Icons.FileTextIcon,
  comments: Icons.Comment,
  pages: Icons.FileIcon,
  databases: Icons.Database,
  emails: Icons.Mail,
  calendar: Icons.Calendar,
  storage: Icons.Folder,
  other: Icons.MoreHorizontal,
};

export interface ConnectorEventUIConfig extends ConnectorEventConfig {
  connectorType: ConnectorType;
  connectorIcon: (typeof Icons)[keyof typeof Icons];
  categoryIcon: (typeof Icons)[keyof typeof Icons];
}

export function getConnectorIcon(
  connectorType: ConnectorType
): (typeof Icons)[keyof typeof Icons] {
  return CONNECTOR_ICONS[connectorType] ?? Icons.Integrations;
}

export function getEventCategoryIcon(
  category: EventCategory
): (typeof Icons)[keyof typeof Icons] {
  return EVENT_CATEGORY_ICONS[category] ?? Icons.MoreHorizontal;
}

export function getConnectorEventsUI(
  connectorType: ConnectorType
): ConnectorEventUIConfig[] {
  const events = getConnectorEvents(connectorType);
  const connectorIcon = getConnectorIcon(connectorType);

  return events.map((event) => ({
    ...event,
    connectorType,
    connectorIcon,
    categoryIcon: getEventCategoryIcon(event.category),
  }));
}

export function getConnectorEventUI(
  connectorType: ConnectorType,
  eventId: string
): ConnectorEventUIConfig | undefined {
  const event = getConnectorEvent(connectorType, eventId);
  if (!event) {
    return;
  }

  return {
    ...event,
    connectorType,
    connectorIcon: getConnectorIcon(connectorType),
    categoryIcon: getEventCategoryIcon(event.category),
  };
}

export function getEventsByCategoryUI(
  connectorType: ConnectorType,
  category: EventCategory
): ConnectorEventUIConfig[] {
  const events = getEventsByCategory(connectorType, category);
  const connectorIcon = getConnectorIcon(connectorType);

  return events.map((event) => ({
    ...event,
    connectorType,
    connectorIcon,
    categoryIcon: getEventCategoryIcon(event.category),
  }));
}

export interface EventCategoryGroup {
  category: EventCategory;
  icon: (typeof Icons)[keyof typeof Icons];
  events: ConnectorEventUIConfig[];
}

export function getEventsByConnectorGrouped(
  connectorType: ConnectorType
): EventCategoryGroup[] {
  const categories = getAllEventCategories(connectorType);

  return categories.map((category) => ({
    category,
    icon: getEventCategoryIcon(category),
    events: getEventsByCategoryUI(connectorType, category),
  }));
}

export interface ConnectorWithEvents {
  type: ConnectorType;
  icon: (typeof Icons)[keyof typeof Icons];
  events: readonly ConnectorEventConfig[];
  eventCount: number;
}

export function getAllConnectorsWithEvents(): ConnectorWithEvents[] {
  const connectorTypes = Object.keys(CONNECTOR_EVENTS) as ConnectorType[];

  return connectorTypes.map((type) => ({
    type,
    icon: getConnectorIcon(type),
    events: getConnectorEvents(type),
    eventCount: getConnectorEvents(type).length,
  }));
}
