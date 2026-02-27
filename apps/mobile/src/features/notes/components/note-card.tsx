import { FileText } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import type { Note } from "@/stores/notes-store";
import { formatTimeAgo } from "@/utils/time";
import { extractPreview } from "../lib/formatters";

type NoteCardProps = {
  note: Note;
  isActive: boolean;
  onPress: () => void;
};

export function NoteCard({ note, isActive, onPress }: NoteCardProps) {
  const { theme } = useUnistyles();
  const preview = extractPreview(note.content);
  const timeAgo = formatTimeAgo(new Date(note.updatedAt));

  return (
    <Pressable
      accessibilityLabel={`Open note: ${note.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        isActive && styles.active,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconContainer}>
        {note.emoji ? (
          <Text style={styles.emoji}>{note.emoji}</Text>
        ) : (
          <FileText
            color={
              isActive ? theme.colors.accent : theme.colors.foregroundMuted
            }
            size={14}
          />
        )}
      </View>
      <View style={styles.content}>
        <Text
          numberOfLines={1}
          style={[styles.title, isActive && styles.titleActive]}
        >
          {note.title}
        </Text>
        {preview ? (
          <Text muted numberOfLines={1} style={styles.preview}>
            {preview}
          </Text>
        ) : null}
      </View>
      <Text muted style={styles.time}>
        {timeAgo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
  },
  active: {
    backgroundColor: theme.colors.surface2,
    borderLeftColor: theme.colors.accent,
  },
  pressed: {
    backgroundColor: theme.colors.surface1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  titleActive: {
    color: theme.colors.foreground,
  },
  preview: {
    fontSize: 12,
    lineHeight: 16,
  },
  time: {
    fontSize: 11,
    flexShrink: 0,
  },
}));
