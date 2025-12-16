import {
  BlockActionPayloadSchema,
  GlobalShortcutPayloadSchema,
  type InteractivityPayload,
  type InteractivityType,
  MessageShortcutPayloadSchema,
  SlashCommandPayloadSchema,
  ViewSubmissionPayloadSchema,
} from "./types";

export type ParsedInteractivityResult =
  | { success: true; payload: InteractivityPayload; type: InteractivityType }
  | { success: false; error: string };

const PAYLOAD_SCHEMAS = {
  block_actions: BlockActionPayloadSchema,
  view_submission: ViewSubmissionPayloadSchema,
  message_action: MessageShortcutPayloadSchema,
  shortcut: GlobalShortcutPayloadSchema,
} as const;

export function parseInteractivityPayload(
  body: unknown
): ParsedInteractivityResult {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Invalid payload: not an object" };
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.command === "string") {
    const result = SlashCommandPayloadSchema.safeParse(payload);
    if (result.success) {
      return { success: true, payload: result.data, type: "slash_command" };
    }
    return {
      success: false,
      error: `Invalid slash command: ${result.error.message}`,
    };
  }

  const payloadType = payload.type as string | undefined;
  if (!payloadType) {
    return { success: false, error: "Missing payload type" };
  }

  const schema = PAYLOAD_SCHEMAS[payloadType as keyof typeof PAYLOAD_SCHEMAS];
  if (!schema) {
    return { success: false, error: `Unknown payload type: ${payloadType}` };
  }

  const result = schema.safeParse(payload);
  if (result.success) {
    return {
      success: true,
      payload: result.data as InteractivityPayload,
      type: payloadType as InteractivityType,
    };
  }

  return {
    success: false,
    error: `Invalid ${payloadType}: ${result.error.message}`,
  };
}

export function extractTeamId(
  payload: InteractivityPayload
): string | undefined {
  if ("team_id" in payload) {
    return payload.team_id;
  }
  if ("team" in payload && payload.team) {
    return payload.team.id;
  }
  return;
}

export function extractUserId(payload: InteractivityPayload): string {
  if ("user_id" in payload) {
    return payload.user_id;
  }
  return payload.user.id;
}

export function extractChannelId(
  payload: InteractivityPayload
): string | undefined {
  if ("channel_id" in payload) {
    return payload.channel_id;
  }
  if ("channel" in payload && payload.channel) {
    return payload.channel.id;
  }
  return;
}

export function extractTriggerId(payload: InteractivityPayload): string {
  return payload.trigger_id;
}
