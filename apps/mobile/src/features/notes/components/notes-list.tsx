import { Plus } from "lucide-react-native";
import { useCallback } from "react";
import { FlatList, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { type Note, useNotesStore } from "@/stores/notes-store";
import { NoteCard } from "./note-card";
import { NotesEmptyState } from "./notes-empty-state";

type NotesListProps = {
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
};

export function NotesList({ onSelectNote, onCreateNote }: NotesListProps) {
  const { theme } = useUnistyles();
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);

  const sorted = [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        isActive={item.id === activeNoteId}
        note={item}
        onPress={() => onSelectNote(item.id)}
      />
    ),
    [activeNoteId, onSelectNote]
  );

  const keyExtractor = useCallback((item: Note) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <Pressable
          accessibilityLabel="Create new note"
          hitSlop={8}
          onPress={onCreateNote}
          style={styles.createButton}
        >
          <Plus color={theme.colors.foreground} size={16} />
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={
          notes.length === 0 ? styles.emptyContainer : styles.listContent
        }
        data={sorted}
        keyExtractor={keyExtractor}
        ListEmptyComponent={<NotesEmptyState onCreateNote={onCreateNote} />}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  createButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface2,
  },
  listContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
  },
}));
