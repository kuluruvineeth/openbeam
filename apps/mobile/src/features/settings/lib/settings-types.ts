export type ThemeMode = "light" | "dark" | "auto";

export type DictationLanguage =
  | "en-US"
  | "en-GB"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "pt-BR"
  | "ja-JP"
  | "ko-KR"
  | "zh-CN"
  | "zh-TW"
  | "nl-NL"
  | "pl-PL"
  | "ru-RU"
  | "sv-SE"
  | "da-DK"
  | "nb-NO"
  | "fi-FI";

export const DICTATION_LANGUAGE_LABELS: Record<DictationLanguage, string> = {
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  "es-ES": "Spanish",
  "fr-FR": "French",
  "de-DE": "German",
  "it-IT": "Italian",
  "pt-BR": "Portuguese (BR)",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "nl-NL": "Dutch",
  "pl-PL": "Polish",
  "ru-RU": "Russian",
  "sv-SE": "Swedish",
  "da-DK": "Danish",
  "nb-NO": "Norwegian",
  "fi-FI": "Finnish",
};

export type DictationPreferences = {
  language: DictationLanguage;
  autoDetectLanguage: boolean;
  smartFormatting: boolean;
  customVocabulary: string[];
};

export type NotificationPreference = {
  syncCompleted: boolean;
  syncFailed: boolean;
  agentUpdates: boolean;
  mentions: boolean;
};

export type SettingsSection =
  | "profile"
  | "team"
  | "notifications"
  | "appearance"
  | "connectedAccounts"
  | "security"
  | "storage"
  | "about"
  | "dangerZone"
  | "dictation"
  | "shortcuts";
