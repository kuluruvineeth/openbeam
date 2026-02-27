import { FileText } from "lucide-react-native";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { EmptyState } from "@/features/layout/components/empty-state";

type NotesEmptyStateProps = {
  onCreateNote: () => void;
};

export function NotesEmptyState({ onCreateNote }: NotesEmptyStateProps) {
  const { theme } = useUnistyles();

  return (
    <EmptyState
      action={
        <Pressable onPress={onCreateNote} style={styles.button}>
          <Text style={styles.buttonText}>Create note</Text>
        </Pressable>
      }
      description="Capture thoughts, save transcriptions, or jot down ideas."
      icon={<FileText color={theme.colors.foregroundMuted} size={24} />}
      title="No notes yet"
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.foreground,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.background,
  },
}));
