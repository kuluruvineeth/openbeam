import {
  BookOpen,
  Globe,
  Keyboard,
  Languages,
  Mic,
  Plus,
  Sparkles,
  Volume2,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { getIsTauri } from "@/constants/layout";
import { useAppSettings } from "@/hooks/use-settings";
import {
  formatNativeHelperShortcut,
  type NativeHelperShortcutKind,
} from "@/utils/native-helper-shortcuts";
import {
  DICTATION_LANGUAGE_LABELS,
  type DictationLanguage,
} from "../lib/settings-types";
import { SettingsRow } from "./settings-row";
import { SettingsDivider, SettingsSection } from "./settings-section";

const LANGUAGE_ENTRIES = Object.entries(DICTATION_LANGUAGE_LABELS) as [
  DictationLanguage,
  string,
][];

type DictationSettingsProps = {
  onNavigateToShortcuts?: () => void;
};

export function DictationSettings({
  onNavigateToShortcuts,
}: DictationSettingsProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { settings, updateSettings } = useAppSettings();
  const [vocabularyInput, setVocabularyInput] = useState("");
  const [languageExpanded, setLanguageExpanded] = useState(false);

  const isDesktop = Platform.OS === "web" && getIsTauri();
  const { dictation } = settings;

  const handleLanguageSelect = useCallback(
    (lang: DictationLanguage) => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({
        dictation: { ...dictation, language: lang },
      });
      setLanguageExpanded(false);
    },
    [dictation, updateSettings]
  );

  const handleToggleAutoDetect = useCallback(
    (value: boolean) => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({
        dictation: { ...dictation, autoDetectLanguage: value },
      });
    },
    [dictation, updateSettings]
  );

  const handleToggleSmartFormatting = useCallback(
    (value: boolean) => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({
        dictation: { ...dictation, smartFormatting: value },
      });
    },
    [dictation, updateSettings]
  );

  const handleToggleMuteAudio = useCallback(
    (value: boolean) => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({ muteSystemAudioDuringDictation: value });
    },
    [updateSettings]
  );

  const handleToggleAutoDictate = useCallback(
    (value: boolean) => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({ autoDictateOnNewNote: value });
    },
    [updateSettings]
  );

  const handleAddVocabulary = useCallback(() => {
    const word = vocabularyInput.trim();
    if (word.length === 0) {
      return;
    }
    if (dictation.customVocabulary.includes(word)) {
      setVocabularyInput("");
      return;
    }
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void updateSettings({
      dictation: {
        ...dictation,
        customVocabulary: [...dictation.customVocabulary, word],
      },
    });
    setVocabularyInput("");
  }, [vocabularyInput, dictation, updateSettings]);

  const handleRemoveVocabulary = useCallback(
    (word: string) => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({
        dictation: {
          ...dictation,
          customVocabulary: dictation.customVocabulary.filter(
            (w) => w !== word
          ),
        },
      });
    },
    [dictation, updateSettings]
  );

  const shortcutLabel = useCallback(
    (kind: NativeHelperShortcutKind) =>
      formatNativeHelperShortcut(settings.nativeHelperShortcuts[kind]),
    [settings.nativeHelperShortcuts]
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <SettingsSection title="Language">
        <SettingsRow
          icon={<Globe color="#6b7280" size={16} strokeWidth={2} />}
          label="Language"
          onPress={() => setLanguageExpanded((prev) => !prev)}
          type="navigate"
          value={DICTATION_LANGUAGE_LABELS[dictation.language]}
        />
        {languageExpanded && (
          <View style={styles.languageList}>
            {LANGUAGE_ENTRIES.map(([code, label]) => (
              <Pressable
                key={code}
                onPress={() => handleLanguageSelect(code)}
                style={[
                  styles.languageOption,
                  code === dictation.language && styles.languageOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.languageLabel,
                    code === dictation.language && styles.languageLabelSelected,
                  ]}
                >
                  {label}
                </Text>
                {code === dictation.language && (
                  <View style={styles.selectedDot} />
                )}
              </Pressable>
            ))}
          </View>
        )}
        <SettingsDivider />
        <SettingsRow
          icon={<Languages color="#6b7280" size={16} strokeWidth={2} />}
          label="Auto-detect language"
          onValueChange={handleToggleAutoDetect}
          sublabel="Automatically detect spoken language"
          type="toggle"
          value={dictation.autoDetectLanguage}
        />
      </SettingsSection>

      <SettingsSection title="Formatting">
        <SettingsRow
          icon={<Sparkles color="#6b7280" size={16} strokeWidth={2} />}
          label="Smart formatting"
          onValueChange={handleToggleSmartFormatting}
          sublabel="Auto-punctuation, capitalization, and number formatting"
          type="toggle"
          value={dictation.smartFormatting}
        />
      </SettingsSection>

      <SettingsSection title="Custom vocabulary">
        <View style={styles.vocabularyDescription}>
          <BookOpen
            color={theme.colors.foregroundMuted}
            size={14}
            strokeWidth={2}
          />
          <Text style={styles.vocabularyHint}>
            Add domain-specific terms for better recognition accuracy
          </Text>
        </View>
        <View style={styles.vocabularyInputRow}>
          <TextInput
            onChangeText={setVocabularyInput}
            onSubmitEditing={handleAddVocabulary}
            placeholder="Add a word or phrase..."
            placeholderTextColor={theme.colors.foregroundMuted}
            returnKeyType="done"
            style={styles.vocabularyTextInput}
            value={vocabularyInput}
          />
          <Pressable
            disabled={vocabularyInput.trim().length === 0}
            onPress={handleAddVocabulary}
            style={[
              styles.addButton,
              vocabularyInput.trim().length === 0 && styles.addButtonDisabled,
            ]}
          >
            <Plus
              color={
                vocabularyInput.trim().length > 0
                  ? theme.colors.foreground
                  : theme.colors.foregroundMuted
              }
              size={14}
              strokeWidth={2}
            />
          </Pressable>
        </View>
        {dictation.customVocabulary.length > 0 && (
          <View style={styles.vocabularyChips}>
            {dictation.customVocabulary.map((word) => (
              <View key={word} style={styles.chip}>
                <Text style={styles.chipText}>{word}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleRemoveVocabulary(word)}
                >
                  <X
                    color={theme.colors.foregroundMuted}
                    size={12}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </SettingsSection>

      <SettingsSection title="Behavior">
        <SettingsRow
          icon={<Volume2 color="#6b7280" size={16} strokeWidth={2} />}
          label="Mute system audio"
          onValueChange={handleToggleMuteAudio}
          sublabel="Silence other audio while recording"
          type="toggle"
          value={settings.muteSystemAudioDuringDictation}
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Mic color="#6b7280" size={16} strokeWidth={2} />}
          label="Auto-dictate on new note"
          onValueChange={handleToggleAutoDictate}
          sublabel="Start recording when creating a note"
          type="toggle"
          value={settings.autoDictateOnNewNote}
        />
      </SettingsSection>

      {isDesktop && (
        <SettingsSection title="Shortcuts">
          <SettingsRow
            icon={<Keyboard color="#6b7280" size={16} strokeWidth={2} />}
            label="Push to Talk"
            onPress={() => onNavigateToShortcuts?.()}
            type="navigate"
            value={shortcutLabel("pushToTalk")}
          />
          <SettingsDivider />
          <SettingsRow
            icon={<Keyboard color="#6b7280" size={16} strokeWidth={2} />}
            label="Toggle Recording"
            onPress={() => onNavigateToShortcuts?.()}
            type="navigate"
            value={shortcutLabel("toggleRecording")}
          />
        </SettingsSection>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing[4],
    gap: theme.spacing[6],
  },
  languageList: {
    paddingHorizontal: theme.spacing[2],
    paddingBottom: theme.spacing[2],
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing[2.5],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.sm,
  },
  languageOptionSelected: {
    backgroundColor: theme.colors.surface2,
  },
  languageLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  languageLabelSelected: {
    fontWeight: theme.fontWeight.medium,
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  vocabularyDescription: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[1],
  },
  vocabularyHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    flex: 1,
  },
  vocabularyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  vocabularyTextInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.surface1,
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface1,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  vocabularyChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1.5],
    paddingVertical: theme.spacing[1],
    paddingLeft: theme.spacing[2.5],
    paddingRight: theme.spacing[2],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface2,
  },
  chipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foreground,
  },
}));
