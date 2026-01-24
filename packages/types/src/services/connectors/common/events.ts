import { z } from "zod";

export type EventCategory =
  | "messages"
  | "channels"
  | "reactions"
  | "files"
  | "users"
  | "issues"
  | "projects"
  | "documents"
  | "comments"
  | "pages"
  | "databases"
  | "emails"
  | "calendar"
  | "storage"
  | "other";

export interface ConnectorEventConfig<TEventId extends string = string> {
  id: TEventId;
  name: string;
  description: string;
  category: EventCategory;
  isRealtime: boolean;
}

export const ConnectorEventConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    "messages",
    "channels",
    "reactions",
    "files",
    "users",
    "issues",
    "projects",
    "documents",
    "comments",
    "pages",
    "databases",
    "emails",
    "calendar",
    "storage",
    "other",
  ]),
  isRealtime: z.boolean(),
});

export type ConnectorEventRegistry = {
  [connectorType: string]: readonly ConnectorEventConfig[];
};

export function defineConnectorEvents<
  TEventId extends string,
  const TEvents extends readonly ConnectorEventConfig<TEventId>[],
>(events: TEvents): TEvents {
  return events;
}
