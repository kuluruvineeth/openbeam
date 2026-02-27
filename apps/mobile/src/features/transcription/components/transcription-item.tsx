import { Copy, Trash2 } from "lucide-react-native";
import { useCallback } from "react";
import { Alert, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import type { Transcription } from "@/stores/transcription-store";
import { formatTimeAgo } from "@/utils/time";
import { formatDuration, languageLabel, truncateText } from "../lib/formatters";

type TranscriptionItemProps = {
  transcription: Transcription;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
};

const TEXT_PREVIEW_LENGTH = 140;

export function TranscriptionItem({
  transcription,
  onCopy,
  onDelete,
}: TranscriptionItemProps) {
  const { theme } = useUnistyles();

  const handleCopy = useCallback(() => {
    onCopy(transcription.text);
  }, [transcription.text, onCopy]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete transcription",
      "This transcription will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(transcription.id),
        },
      ]
    );
  }, [transcription.id, onDelete]);

  const preview = truncateText(transcription.text, TEXT_PREVIEW_LENGTH);
  const timeAgo = formatTimeAgo(new Date(transcription.createdAt));
  const duration = formatDuration(transcription.durationMs);
  const lang = languageLabel(transcription.language);

  return (
    <View style={styles.container}>
      <Text numberOfLines={2} style={styles.preview}>
        {preview}
      </Text>

      <View style={styles.metaRow}>
        <Text muted style={styles.metaText}>
          {timeAgo}
        </Text>
        <Text muted style={styles.metaDot}>
          ·
        </Text>
        <Text muted style={styles.metaText}>
          {duration}
        </Text>
        <Text muted style={styles.metaDot}>
          ·
        </Text>
        <Text muted style={styles.metaText}>
          {lang}
        </Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Copy transcription"
            hitSlop={6}
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Copy color={theme.colors.foregroundMuted} size={14} />
          </Pressable>
          <Pressable
            accessibilityLabel="Delete transcription"
            hitSlop={6}
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Trash2 color={theme.colors.foregroundMuted} size={14} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[2],
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.foreground,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    marginLeft: "auto",
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPressed: {
    backgroundColor: theme.colors.muted,
  },
}));
