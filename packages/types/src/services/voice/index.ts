import { z } from "zod";

export const VoiceEngine = z.enum(["local", "cloud", "hybrid"]);
export type VoiceEngine = z.infer<typeof VoiceEngine>;

export const VoiceRoomType = z.enum(["dictation", "action"]);
export type VoiceRoomType = z.infer<typeof VoiceRoomType>;

export const VoiceSessionStatus = z.enum(["active", "completed", "error"]);
export type VoiceSessionStatus = z.infer<typeof VoiceSessionStatus>;

export const VoiceFormatStyle = z.enum([
  "context-aware",
  "formal",
  "casual",
  "technical",
  "off",
]);
export type VoiceFormatStyle = z.infer<typeof VoiceFormatStyle>;

export const WidgetPosition = z.enum([
  "top-center",
  "top-right",
  "bottom-center",
  "bottom-right",
]);
export type WidgetPosition = z.infer<typeof WidgetPosition>;

export const VoiceNoteContextSchema = z.object({
  appName: z.string().optional(),
  fieldType: z.string().optional(),
  url: z.string().optional(),
});
export type VoiceNoteContext = z.infer<typeof VoiceNoteContextSchema>;

export const VoiceNoteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  text: z.string(),
  audioUrl: z.string().nullable(),
  duration: z.number().nullable(),
  context: VoiceNoteContextSchema.nullable(),
  tags: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type VoiceNote = z.infer<typeof VoiceNoteSchema>;

export const CreateVoiceNoteInputSchema = z.object({
  text: z.string().min(1),
  audioUrl: z.string().optional(),
  duration: z.number().int().positive().optional(),
  context: VoiceNoteContextSchema.optional(),
  tags: z.array(z.string()).optional().default([]),
});
export type CreateVoiceNoteInput = z.infer<typeof CreateVoiceNoteInputSchema>;

export const ListVoiceNotesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
});
export type ListVoiceNotesInput = z.infer<typeof ListVoiceNotesInputSchema>;

export const VoiceShortcutsSchema = z.object({
  dictation: z.string(),
  action: z.string(),
  voiceNotes: z.string(),
  cancel: z.string(),
});
export type VoiceShortcuts = z.infer<typeof VoiceShortcutsSchema>;

const DEFAULT_SHORTCUTS: VoiceShortcuts = {
  dictation: "ctrl+space",
  action: "ctrl+space",
  voiceNotes: "mod+shift+n",
  cancel: "escape",
};

export const VoiceSettingsSchema = z.object({
  engine: VoiceEngine.default("cloud"),
  model: z.string().default("base.en"),
  language: z.string().default("en"),
  formatting: z.boolean().default(true),
  formatStyle: VoiceFormatStyle.default("context-aware"),
  shortcuts: VoiceShortcutsSchema.default(DEFAULT_SHORTCUTS),
  vocabulary: z.array(z.string()).default([]),
  widgetPosition: WidgetPosition.default("bottom-center"),
  widgetOpacity: z.number().min(0).max(1).default(0.7),
  autoHide: z.boolean().default(false),
});
export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;

export const UpdateVoiceSettingsInputSchema = VoiceSettingsSchema.partial();
export type UpdateVoiceSettingsInput = z.infer<
  typeof UpdateVoiceSettingsInputSchema
>;

export const VoiceSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  roomType: VoiceRoomType,
  roomName: z.string().nullable(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  duration: z.number().nullable(),
  wordsSpoken: z.number(),
  toolCalls: z.number(),
  status: VoiceSessionStatus,
});
export type VoiceSession = z.infer<typeof VoiceSessionSchema>;

export const VoiceTokenRequestSchema = z.object({
  roomType: VoiceRoomType,
});
export type VoiceTokenRequest = z.infer<typeof VoiceTokenRequestSchema>;

export const VoiceTokenResponseSchema = z.object({
  token: z.string(),
  wsUrl: z.string(),
});
export type VoiceTokenResponse = z.infer<typeof VoiceTokenResponseSchema>;

export const LiveKitWebhookEventSchema = z.object({
  event: z.string(),
  room: z
    .object({
      name: z.string(),
      sid: z.string(),
      creationTime: z.number().optional(),
      numParticipants: z.number().optional(),
    })
    .optional(),
  participant: z
    .object({
      sid: z.string(),
      identity: z.string(),
      name: z.string().optional(),
      joinedAt: z.number().optional(),
    })
    .optional(),
  createdAt: z.number().optional(),
});
export type LiveKitWebhookEvent = z.infer<typeof LiveKitWebhookEventSchema>;
