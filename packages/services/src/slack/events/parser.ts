import { createHmac, timingSafeEqual } from "node:crypto";
import {
  AppHomeOpenedEventSchema,
  AppMentionEventSchema,
  AssistantThreadContextChangedEventSchema,
  AssistantThreadStartedEventSchema,
  BookmarkAddedEventSchema,
  BookmarkDeletedEventSchema,
  ChannelArchiveEventSchema,
  ChannelCreatedEventSchema,
  ChannelDeletedEventSchema,
  ChannelRenameEventSchema,
  ChannelUnarchiveEventSchema,
  FileDeletedEventSchema,
  FileSharedEventSchema,
  MemberJoinedChannelEventSchema,
  MemberLeftChannelEventSchema,
  MessageChangedEventSchema,
  MessageDeletedEventSchema,
  MessageEventSchema,
  ReactionAddedEventSchema,
  ReactionRemovedEventSchema,
  type SlackEvent,
  type SlackEventEnvelope,
  SlackEventEnvelopeSchema,
  UserChangeEventSchema,
} from "./types";

export interface SlackEventRequest {
  body: string;
  signature: string;
  timestamp: string;
}

export type ParsedEventResult =
  | { success: true; envelope: SlackEventEnvelope; event: SlackEvent | null }
  | { success: false; error: string };

export type VerifyResult = { valid: true } | { valid: false; reason: string };

export function verifySlackSignature(
  request: SlackEventRequest,
  signingSecret: string
): VerifyResult {
  const { body, signature, timestamp } = request;

  if (!(signature && timestamp && body)) {
    return { valid: false, reason: "Missing required headers or body" };
  }

  const requestTime = Number.parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);

  if (Number.isNaN(requestTime)) {
    return { valid: false, reason: "Invalid timestamp format" };
  }

  if (Math.abs(currentTime - requestTime) > 300) {
    return { valid: false, reason: "Request timestamp too old" };
  }

  const sigBaseString = `v0:${timestamp}:${body}`;
  const expectedSignature = `v0=${createHmac("sha256", signingSecret)
    .update(sigBaseString, "utf8")
    .digest("hex")}`;

  try {
    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: "Signature length mismatch" };
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, reason: "Signature mismatch" };
    }
  } catch {
    return { valid: false, reason: "Signature comparison failed" };
  }

  return { valid: true };
}

export function parseSlackEvent(payload: unknown): ParsedEventResult {
  const envelopeResult = SlackEventEnvelopeSchema.safeParse(payload);

  if (!envelopeResult.success) {
    return {
      success: false,
      error: `Invalid envelope: ${envelopeResult.error.message}`,
    };
  }

  const envelope = envelopeResult.data;

  if (envelope.type === "url_verification") {
    return { success: true, envelope, event: null };
  }

  if (envelope.type === "app_rate_limited") {
    return { success: true, envelope, event: null };
  }

  if (!envelope.event) {
    return { success: false, error: "Missing event in callback" };
  }

  const event = parseEventPayload(envelope.event);

  if (!event) {
    return { success: true, envelope, event: null };
  }

  return { success: true, envelope, event };
}

// Schema registry for event types
type EventSchema = {
  safeParse: (data: unknown) => { success: boolean; data?: SlackEvent };
};

const EVENT_SCHEMAS: Record<string, EventSchema> = {
  app_home_opened: AppHomeOpenedEventSchema,
  app_mention: AppMentionEventSchema,
  assistant_thread_context_changed: AssistantThreadContextChangedEventSchema,
  assistant_thread_started: AssistantThreadStartedEventSchema,
  bookmark_added: BookmarkAddedEventSchema,
  bookmark_deleted: BookmarkDeletedEventSchema,
  channel_archive: ChannelArchiveEventSchema,
  channel_created: ChannelCreatedEventSchema,
  channel_deleted: ChannelDeletedEventSchema,
  channel_rename: ChannelRenameEventSchema,
  channel_unarchive: ChannelUnarchiveEventSchema,
  file_deleted: FileDeletedEventSchema,
  file_shared: FileSharedEventSchema,
  member_joined_channel: MemberJoinedChannelEventSchema,
  member_left_channel: MemberLeftChannelEventSchema,
  reaction_added: ReactionAddedEventSchema,
  reaction_removed: ReactionRemovedEventSchema,
  user_change: UserChangeEventSchema,
};

const MESSAGE_SUBTYPE_SCHEMAS: Record<string, EventSchema> = {
  message_changed: MessageChangedEventSchema,
  message_deleted: MessageDeletedEventSchema,
};

function tryParseWithSchema(
  schema: EventSchema,
  payload: unknown
): SlackEvent | null {
  const result = schema.safeParse(payload);
  return result.success ? (result.data as SlackEvent) : null;
}

function parseMessageEvent(
  payload: unknown,
  subtype: unknown
): SlackEvent | null {
  if (typeof subtype === "string") {
    const schema = MESSAGE_SUBTYPE_SCHEMAS[subtype];
    if (schema) {
      return tryParseWithSchema(schema, payload);
    }
  }
  return tryParseWithSchema(MessageEventSchema, payload);
}

function parseEventPayload(payload: unknown): SlackEvent | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const eventObj = payload as Record<string, unknown>;
  const type = eventObj.type;

  if (typeof type !== "string") {
    return null;
  }

  if (type === "message") {
    return parseMessageEvent(payload, eventObj.subtype);
  }

  const schema = EVENT_SCHEMAS[type];
  return schema ? tryParseWithSchema(schema, payload) : null;
}

export function isMessageEvent(
  event: SlackEvent
): event is Extract<SlackEvent, { type: "message" }> {
  return event.type === "message";
}

export function isMessageChangedEvent(
  event: SlackEvent
): event is Extract<SlackEvent, { subtype: "message_changed" }> {
  return (
    event.type === "message" &&
    "subtype" in event &&
    event.subtype === "message_changed"
  );
}

export function isMessageDeletedEvent(
  event: SlackEvent
): event is Extract<SlackEvent, { subtype: "message_deleted" }> {
  return (
    event.type === "message" &&
    "subtype" in event &&
    event.subtype === "message_deleted"
  );
}

export function isReactionEvent(
  event: SlackEvent
): event is Extract<
  SlackEvent,
  { type: "reaction_added" | "reaction_removed" }
> {
  return event.type === "reaction_added" || event.type === "reaction_removed";
}

export function isChannelEvent(event: SlackEvent): boolean {
  return [
    "channel_created",
    "channel_rename",
    "channel_archive",
    "channel_unarchive",
    "channel_deleted",
  ].includes(event.type);
}

export function isMemberEvent(event: SlackEvent): boolean {
  return ["member_joined_channel", "member_left_channel"].includes(event.type);
}

export function isBookmarkEvent(event: SlackEvent): boolean {
  return ["bookmark_added", "bookmark_deleted"].includes(event.type);
}

export function isFileEvent(event: SlackEvent): boolean {
  return ["file_shared", "file_deleted"].includes(event.type);
}

export function getEventChannelId(event: SlackEvent): string | undefined {
  if ("channel" in event) {
    return typeof event.channel === "string"
      ? event.channel
      : (event.channel as { id?: string })?.id;
  }

  if ("item" in event && event.item && typeof event.item === "object") {
    return (event.item as { channel?: string }).channel;
  }

  return;
}

export function getEventUserId(event: SlackEvent): string | undefined {
  if ("user" in event) {
    return typeof event.user === "string"
      ? event.user
      : (event.user as { id?: string })?.id;
  }

  return;
}
