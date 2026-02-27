import {
  type Database,
  findVoiceSettings,
  upsertVoiceSettings,
} from "@openplane/db";
import type { UpdateVoiceSettingsInput } from "@openplane/types/services/voice";

const DEFAULTS = {
  engine: "cloud",
  model: "base.en",
  language: "en",
  formatting: true,
  formatStyle: "context-aware",
  shortcuts: {
    dictation: "ctrl+space",
    action: "ctrl+space",
    voiceNotes: "mod+shift+n",
    cancel: "escape",
  },
  vocabulary: [],
  widgetPosition: "bottom-center",
  widgetOpacity: 0.7,
  autoHide: false,
} as const;

export async function getSettings(db: Database, userId: string) {
  const existing = await findVoiceSettings(db, userId);
  if (existing) {
    return existing;
  }

  return {
    id: "",
    userId,
    ...DEFAULTS,
    shortcuts: DEFAULTS.shortcuts as unknown as Record<string, unknown>,
    vocabulary: [...DEFAULTS.vocabulary],
    updatedAt: new Date(),
  };
}

export function updateSettings(
  db: Database,
  userId: string,
  input: UpdateVoiceSettingsInput
) {
  return upsertVoiceSettings(db, userId, {
    engine: input.engine,
    model: input.model,
    language: input.language,
    formatting: input.formatting,
    formatStyle: input.formatStyle,
    shortcuts: input.shortcuts as Record<string, unknown> | undefined,
    vocabulary: input.vocabulary,
    widgetPosition: input.widgetPosition,
    widgetOpacity: input.widgetOpacity,
    autoHide: input.autoHide,
  });
}
