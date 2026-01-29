import { z } from "zod";
import {
  type ConnectorEventConfig,
  defineConnectorEvents,
} from "../common/events";

export const GMAIL_EVENT_IDS = [
  "message.received",
  "message.sent",
  "message.read",
  "message.deleted",
] as const;

export type GmailEventId = (typeof GMAIL_EVENT_IDS)[number];

export const GMAIL_EVENTS = defineConnectorEvents<
  GmailEventId,
  readonly ConnectorEventConfig<GmailEventId>[]
>([
  {
    id: "message.received",
    name: "Email Received",
    description: "Triggered when a new email is received",
    category: "emails",
    isRealtime: true,
  },
  {
    id: "message.sent",
    name: "Email Sent",
    description: "Triggered when an email is sent",
    category: "emails",
    isRealtime: true,
  },
  {
    id: "message.read",
    name: "Email Read",
    description: "Triggered when an email is marked as read",
    category: "emails",
    isRealtime: true,
  },
  {
    id: "message.deleted",
    name: "Email Deleted",
    description: "Triggered when an email is deleted or moved to trash",
    category: "emails",
    isRealtime: true,
  },
]);

export const GmailEventIdSchema = z.enum(GMAIL_EVENT_IDS);
