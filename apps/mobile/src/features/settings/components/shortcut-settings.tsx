import { AlertTriangle, Keyboard, RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useAppSettings } from "@/hooks/use-settings";
import {
  formatNativeHelperShortcut,
  getDefaultNativeHelperShortcutConfig,
  type NativeHelperShortcutKind,
  normalizeNativeHelperShortcutKeys,
} from "@/utils/native-helper-shortcuts";
import { SettingsDivider, SettingsSection } from "./settings-section";

type ShortcutEntry = {
  kind: NativeHelperShortcutKind;
  label: string;
  description: string;
};

const SHORTCUT_ENTRIES: ShortcutEntry[] = [
  {
    kind: "pushToTalk",
    label: "Push to Talk",
    description: "Hold to record, release to stop",
  },
  {
    kind: "toggleRecording",
    label: "Toggle Recording",
    description: "Press to start/stop recording",
  },
  {
    kind: "pasteLastTranscript",
    label: "Paste Last Transcript",
    description: "Insert most recent transcription",
  },
  {
    kind: "newNote",
    label: "New Note",
    description: "Create a new voice note",
  },
];

export function ShortcutSettings() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { settings, updateSettings } = useAppSettings();
  const [recordingKind, setRecordingKind] =
    useState<NativeHelperShortcutKind | null>(null);
  const [capturedKeys, setCapturedKeys] = useState<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shortcuts = settings.nativeHelperShortcuts;

  const detectConflict = useCallback(
    (
      kind: NativeHelperShortcutKind,
      keys: number[]
    ): NativeHelperShortcutKind | null => {
      if (keys.length === 0) {
        return null;
      }
      const normalized = normalizeNativeHelperShortcutKeys(keys);
      for (const entry of SHORTCUT_ENTRIES) {
        if (entry.kind === kind) {
          continue;
        }
        const existing = normalizeNativeHelperShortcutKeys(
          shortcuts[entry.kind]
        );
        if (
          existing.length === normalized.length &&
          existing.every((k) => normalized.includes(k))
        ) {
          return entry.kind;
        }
      }
      return null;
    },
    [shortcuts]
  );

  const handleStartRecording = useCallback((kind: NativeHelperShortcutKind) => {
    setRecordingKind(kind);
    setCapturedKeys([]);
  }, []);

  const handleCancelRecording = useCallback(() => {
    setRecordingKind(null);
    setCapturedKeys([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleSaveShortcut = useCallback(
    (kind: NativeHelperShortcutKind, keys: number[]) => {
      const normalized = normalizeNativeHelperShortcutKeys(keys);
      if (normalized.length === 0) {
        return;
      }

      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({
        nativeHelperShortcuts: {
          ...shortcuts,
          [kind]: normalized,
        },
      });
      setRecordingKind(null);
      setCapturedKeys([]);
    },
    [shortcuts, updateSettings]
  );

  const handleResetAll = useCallback(() => {
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void updateSettings({
      nativeHelperShortcuts: getDefaultNativeHelperShortcutConfig(),
    });
  }, [updateSettings]);

  useEffect(() => {
    if (recordingKind === null) {
      return;
    }

    const pressedKeys = new Set<number>();

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      pressedKeys.add(e.keyCode);
      setCapturedKeys(Array.from(pressedKeys));

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const finalKeys = Array.from(pressedKeys);
      pressedKeys.delete(e.keyCode);

      if (pressedKeys.size === 0 && finalKeys.length > 0) {
        timeoutRef.current = setTimeout(() => {
          handleSaveShortcut(recordingKind, finalKeys);
        }, 200);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [recordingKind, handleSaveShortcut]);

  const conflictingKind =
    recordingKind && capturedKeys.length > 0
      ? detectConflict(recordingKind, capturedKeys)
      : null;

  const conflictLabel = conflictingKind
    ? SHORTCUT_ENTRIES.find((e) => e.kind === conflictingKind)?.label
    : null;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <SettingsSection title="Keyboard shortcuts">
        {SHORTCUT_ENTRIES.map((entry, index) => {
          const isRecording = recordingKind === entry.kind;
          const displayKeys = isRecording
            ? capturedKeys
            : shortcuts[entry.kind];
          const formatted = formatNativeHelperShortcut(displayKeys);

          return (
            <View key={entry.kind}>
              {index > 0 && <SettingsDivider />}
              <Pressable
                onPress={() =>
                  isRecording
                    ? handleCancelRecording()
                    : handleStartRecording(entry.kind)
                }
                style={[
                  styles.shortcutRow,
                  isRecording && styles.shortcutRowRecording,
                ]}
              >
                <View style={styles.shortcutInfo}>
                  <Keyboard
                    color={isRecording ? theme.colors.foreground : "#6b7280"}
                    size={16}
                    strokeWidth={2}
                  />
                  <View style={styles.shortcutLabels}>
                    <Text
                      style={[
                        styles.shortcutLabel,
                        isRecording && styles.shortcutLabelActive,
                      ]}
                    >
                      {entry.label}
                    </Text>
                    <Text style={styles.shortcutDescription}>
                      {entry.description}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.keyCombination,
                    isRecording && styles.keyCombinationRecording,
                  ]}
                >
                  <Text
                    style={[
                      styles.keyText,
                      isRecording && styles.keyTextRecording,
                    ]}
                  >
                    {isRecording && capturedKeys.length === 0
                      ? "Press keys..."
                      : formatted}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </SettingsSection>

      {conflictingKind && conflictLabel && (
        <View style={styles.conflictBanner}>
          <AlertTriangle color="#f59e0b" size={14} strokeWidth={2} />
          <Text style={styles.conflictText}>
            Conflicts with &quot;{conflictLabel}&quot; — saving will overwrite
          </Text>
        </View>
      )}

      <SettingsSection>
        <Pressable onPress={handleResetAll} style={styles.resetRow}>
          <RotateCcw color="#6b7280" size={16} strokeWidth={2} />
          <Text style={styles.resetLabel}>Reset all to defaults</Text>
        </Pressable>
      </SettingsSection>

      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          Click a shortcut to record a new key combination. Press Escape to
          cancel. Shortcuts work globally when the app is running.
        </Text>
      </View>
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
  shortcutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  shortcutRowRecording: {
    backgroundColor: theme.colors.surface1,
  },
  shortcutInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    flex: 1,
  },
  shortcutLabels: {
    flex: 1,
    gap: 2,
  },
  shortcutLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  shortcutLabelActive: {
    fontWeight: theme.fontWeight.medium,
  },
  shortcutDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  keyCombination: {
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[2.5],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  keyCombinationRecording: {
    borderColor: theme.colors.foreground,
    backgroundColor: theme.colors.surface1,
  },
  keyText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.foregroundMuted,
  },
  keyTextRecording: {
    color: theme.colors.foreground,
  },
  conflictBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2.5],
    paddingHorizontal: theme.spacing[4],
    marginHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${"#f59e0b"}10`,
    borderWidth: 1,
    borderColor: `${"#f59e0b"}30`,
  },
  conflictText: {
    fontSize: theme.fontSize.xs,
    color: "#f59e0b",
    flex: 1,
  },
  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  resetLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  hintContainer: {
    paddingHorizontal: theme.spacing[4],
  },
  hintText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    lineHeight: 18,
  },
}));
