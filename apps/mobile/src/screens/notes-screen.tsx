import { useCallback } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { NotesList } from "@/features/notes/components/notes-list";
import { useNoteActions } from "@/features/notes/hooks/use-note-actions";

type NotesScreenProps = {
  serverId: string;
};

export function NotesScreen({ serverId }: NotesScreenProps) {
  const { createNote, navigateToNote } = useNoteActions(serverId);

  const handleCreate = useCallback(() => {
    createNote();
  }, [createNote]);

  const handleSelect = useCallback(
    (noteId: string) => {
      navigateToNote(noteId);
    },
    [navigateToNote]
  );

  return (
    <View style={styles.container}>
      <NotesList onCreateNote={handleCreate} onSelectNote={handleSelect} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
  },
}));
