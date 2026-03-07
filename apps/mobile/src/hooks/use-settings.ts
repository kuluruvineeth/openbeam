import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type {
  DictationLanguage,
  DictationPreferences,
} from "@/features/settings/lib/settings-types";
import { DICTATION_LANGUAGE_LABELS } from "@/features/settings/lib/settings-types";
import {
  coerceNativeHelperShortcutConfig,
  getDefaultNativeHelperShortcutConfig,
  type NativeHelperShortcutConfig,
} from "@/utils/native-helper-shortcuts";

const APP_SETTINGS_KEY = "@openbeam:app-settings";
const LEGACY_SETTINGS_KEY = "@openbeam:settings";
const APP_SETTINGS_QUERY_KEY = ["app-settings"];

export interface AppSettings {
  theme: "dark" | "light" | "auto";
  nativeHelperShortcuts: NativeHelperShortcutConfig;
  muteSystemAudioDuringDictation: boolean;
  autoDictateOnNewNote: boolean;
  dictation: DictationPreferences;
}

const DEFAULT_THEME: AppSettings["theme"] = "dark";

const DEFAULT_DICTATION: DictationPreferences = {
  language: "en-US",
  autoDetectLanguage: true,
  smartFormatting: true,
  customVocabulary: [],
};

function createDefaultAppSettings(): AppSettings {
  return {
    theme: DEFAULT_THEME,
    nativeHelperShortcuts: getDefaultNativeHelperShortcutConfig(),
    muteSystemAudioDuringDictation: true,
    autoDictateOnNewNote: false,
    dictation: { ...DEFAULT_DICTATION },
  };
}

export interface UseAppSettingsReturn {
  settings: AppSettings;
  isLoading: boolean;
  error: unknown | null;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export function useAppSettings(): UseAppSettingsReturn {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: loadSettingsFromStorage,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      try {
        const prev =
          queryClient.getQueryData<AppSettings>(APP_SETTINGS_QUERY_KEY) ??
          createDefaultAppSettings();
        const next = normalizeAppSettings({ ...prev, ...updates });
        queryClient.setQueryData<AppSettings>(APP_SETTINGS_QUERY_KEY, next);
        await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
      } catch (err) {
        console.error("[AppSettings] Failed to save settings:", err);
        throw err;
      }
    },
    [queryClient]
  );

  const resetSettings = useCallback(async () => {
    try {
      const next = createDefaultAppSettings();
      queryClient.setQueryData<AppSettings>(APP_SETTINGS_QUERY_KEY, next);
      await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("[AppSettings] Failed to reset settings:", err);
      throw err;
    }
  }, [queryClient]);

  return {
    settings: data ?? createDefaultAppSettings(),
    isLoading: isPending,
    error: error ?? null,
    updateSettings,
    resetSettings,
  };
}

async function loadSettingsFromStorage(): Promise<AppSettings> {
  try {
    const defaults = createDefaultAppSettings();
    const stored = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      return normalizeAppSettings(parsed, defaults);
    }

    const legacyStored = await AsyncStorage.getItem(LEGACY_SETTINGS_KEY);
    if (legacyStored) {
      const legacyParsed = JSON.parse(legacyStored) as Record<string, unknown>;
      const next = normalizeAppSettings(
        {
          ...defaults,
          ...pickAppSettingsFromLegacy(legacyParsed),
        },
        defaults
      );
      await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
      return next;
    }

    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(defaults));
    return defaults;
  } catch (error) {
    console.error("[AppSettings] Failed to load settings:", error);
    throw error;
  }
}

function isValidDictationLanguage(value: unknown): value is DictationLanguage {
  return typeof value === "string" && value in DICTATION_LANGUAGE_LABELS;
}

function normalizeDictationPreferences(
  input: unknown,
  defaults: DictationPreferences
): DictationPreferences {
  const candidate = (
    typeof input === "object" && input !== null ? input : {}
  ) as Partial<Record<string, unknown>>;
  return {
    language: isValidDictationLanguage(candidate.language)
      ? candidate.language
      : defaults.language,
    autoDetectLanguage:
      typeof candidate.autoDetectLanguage === "boolean"
        ? candidate.autoDetectLanguage
        : defaults.autoDetectLanguage,
    smartFormatting:
      typeof candidate.smartFormatting === "boolean"
        ? candidate.smartFormatting
        : defaults.smartFormatting,
    customVocabulary: Array.isArray(candidate.customVocabulary)
      ? candidate.customVocabulary.filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        )
      : defaults.customVocabulary,
  };
}

function normalizeAppSettings(
  input: Partial<AppSettings>,
  defaults: AppSettings = createDefaultAppSettings()
): AppSettings {
  return {
    theme:
      input.theme === "dark" ||
      input.theme === "light" ||
      input.theme === "auto"
        ? input.theme
        : defaults.theme,
    nativeHelperShortcuts: coerceNativeHelperShortcutConfig(
      input.nativeHelperShortcuts,
      {
        fallback: defaults.nativeHelperShortcuts,
      }
    ),
    muteSystemAudioDuringDictation:
      typeof input.muteSystemAudioDuringDictation === "boolean"
        ? input.muteSystemAudioDuringDictation
        : defaults.muteSystemAudioDuringDictation,
    autoDictateOnNewNote:
      typeof input.autoDictateOnNewNote === "boolean"
        ? input.autoDictateOnNewNote
        : defaults.autoDictateOnNewNote,
    dictation: normalizeDictationPreferences(
      input.dictation,
      defaults.dictation
    ),
  };
}

function pickAppSettingsFromLegacy(
  legacy: Record<string, unknown>
): Partial<AppSettings> {
  const result: Partial<AppSettings> = {};
  if (
    legacy.theme === "dark" ||
    legacy.theme === "light" ||
    legacy.theme === "auto"
  ) {
    result.theme = legacy.theme;
  }
  if (typeof legacy.muteSystemAudioDuringDictation === "boolean") {
    result.muteSystemAudioDuringDictation =
      legacy.muteSystemAudioDuringDictation;
  } else if (typeof legacy.muteSystemAudio === "boolean") {
    result.muteSystemAudioDuringDictation = legacy.muteSystemAudio;
  }
  if (typeof legacy.autoDictateOnNewNote === "boolean") {
    result.autoDictateOnNewNote = legacy.autoDictateOnNewNote;
  }
  return result;
}

export const useSettings = useAppSettings;
