import { z } from "zod";

export const SlashCommandPayloadSchema = z.object({
  token: z.string(),
  team_id: z.string(),
  team_domain: z.string(),
  enterprise_id: z.string().optional(),
  enterprise_name: z.string().optional(),
  channel_id: z.string(),
  channel_name: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  command: z.string(),
  text: z.string(),
  response_url: z.string(),
  trigger_id: z.string(),
  api_app_id: z.string(),
});

export type SlashCommandPayload = z.infer<typeof SlashCommandPayloadSchema>;

export const BlockActionSchema = z.object({
  action_id: z.string(),
  block_id: z.string().optional(),
  type: z.string(),
  value: z.string().optional(),
  selected_option: z
    .object({
      text: z.object({ type: z.string(), text: z.string() }).optional(),
      value: z.string(),
    })
    .optional(),
  selected_options: z.array(z.object({ value: z.string() })).optional(),
});

export type BlockAction = z.infer<typeof BlockActionSchema>;

export const BlockActionPayloadSchema = z.object({
  type: z.literal("block_actions"),
  user: z.object({
    id: z.string(),
    username: z.string().optional(),
    name: z.string().optional(),
    team_id: z.string().optional(),
  }),
  api_app_id: z.string().optional(),
  team: z
    .object({
      id: z.string(),
      domain: z.string().optional(),
    })
    .optional(),
  channel: z
    .object({
      id: z.string(),
      name: z.string().optional(),
    })
    .optional(),
  message: z
    .object({
      type: z.string().optional(),
      ts: z.string(),
      thread_ts: z.string().optional(),
      text: z.string().optional(),
      blocks: z.array(z.record(z.string(), z.unknown())).optional(),
    })
    .optional(),
  container: z
    .object({
      type: z.string(),
      message_ts: z.string().optional(),
      channel_id: z.string().optional(),
      is_ephemeral: z.boolean().optional(),
    })
    .optional(),
  actions: z.array(BlockActionSchema),
  trigger_id: z.string(),
  response_url: z.string().optional(),
});

export type BlockActionPayload = z.infer<typeof BlockActionPayloadSchema>;

export const ViewSubmissionPayloadSchema = z.object({
  type: z.literal("view_submission"),
  team: z.object({
    id: z.string(),
    domain: z.string().optional(),
  }),
  user: z.object({
    id: z.string(),
    username: z.string().optional(),
    name: z.string().optional(),
    team_id: z.string().optional(),
  }),
  api_app_id: z.string().optional(),
  view: z.object({
    id: z.string(),
    team_id: z.string().optional(),
    type: z.string(),
    callback_id: z.string(),
    private_metadata: z.string().optional(),
    state: z.object({
      values: z.record(z.string(), z.record(z.string(), z.unknown())),
    }),
    hash: z.string().optional(),
  }),
  trigger_id: z.string(),
  response_urls: z.array(z.object({ response_url: z.string() })).optional(),
});

export type ViewSubmissionPayload = z.infer<typeof ViewSubmissionPayloadSchema>;

export const MessageShortcutPayloadSchema = z.object({
  type: z.literal("message_action"),
  callback_id: z.string(),
  trigger_id: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string().optional(),
    name: z.string().optional(),
    team_id: z.string().optional(),
  }),
  team: z
    .object({
      id: z.string(),
      domain: z.string().optional(),
    })
    .optional(),
  channel: z.object({
    id: z.string(),
    name: z.string().optional(),
  }),
  message: z.object({
    type: z.string().optional(),
    ts: z.string(),
    text: z.string().optional(),
    user: z.string().optional(),
    thread_ts: z.string().optional(),
  }),
  response_url: z.string(),
});

export type MessageShortcutPayload = z.infer<
  typeof MessageShortcutPayloadSchema
>;

export const GlobalShortcutPayloadSchema = z.object({
  type: z.literal("shortcut"),
  callback_id: z.string(),
  trigger_id: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string().optional(),
    name: z.string().optional(),
    team_id: z.string().optional(),
  }),
  team: z
    .object({
      id: z.string(),
      domain: z.string().optional(),
    })
    .optional(),
});

export type GlobalShortcutPayload = z.infer<typeof GlobalShortcutPayloadSchema>;

export type InteractivityPayload =
  | SlashCommandPayload
  | BlockActionPayload
  | ViewSubmissionPayload
  | MessageShortcutPayload
  | GlobalShortcutPayload;

export type InteractivityType =
  | "slash_command"
  | "block_actions"
  | "view_submission"
  | "message_action"
  | "shortcut";
