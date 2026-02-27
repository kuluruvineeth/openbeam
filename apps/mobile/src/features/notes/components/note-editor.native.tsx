import { useCallback, useEffect, useRef } from "react";
import { TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useNotesStore } from "@/stores/notes-store";
import { NOTE_DEBOUNCE_SAVE_MS } from "../constants";

type NoteEditorProps = {
  noteId: string;
};

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { theme } = useUnistyles();
  const note = useNotesStore((s) => s.notes.find((n) => n.id === noteId));
  const updateNote = useNotesStore((s) => s.updateNote);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(note?.content ?? "");

  useEffect(() => {
    contentRef.current = note?.content ?? "";
  }, [note?.content]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const handleChange = useCallback(
    (text: string) => {
      contentRef.current = text;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        updateNote(noteId, { content: text });
      }, NOTE_DEBOUNCE_SAVE_MS);
    },
    [noteId, updateNote]
  );

  if (!note) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TextInput
        defaultValue={note.content}
        multiline
        onChangeText={handleChange}
        placeholder="Start writing..."
        placeholderTextColor={theme.colors.foregroundMuted}
        scrollEnabled
        style={[styles.input, { color: theme.colors.foreground }]}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create((_theme) => ({
  container: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    padding: 16,
    fontFamily: undefined,
  },
}));
