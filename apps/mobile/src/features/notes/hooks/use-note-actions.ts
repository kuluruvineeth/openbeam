import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useDictationStore } from "@/stores/dictation-store";
import { useNotesStore } from "@/stores/notes-store";

export function useNoteActions(serverId: string) {
  const router = useRouter();
  const createNote = useNotesStore((s) => s.createNote);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const navigateToNote = useCallback(
    (noteId: string) => {
      setActiveNote(noteId);
      router.push(`/h/${serverId}/notes/${noteId}` as never);
    },
    [serverId, router, setActiveNote]
  );

  const handleCreateNote = useCallback(
    (title?: string, initialContent?: string) => {
      const note = createNote(title, initialContent);
      navigateToNote(note.id);
      return note;
    },
    [createNote, navigateToNote]
  );

  const handleCreateFromDictation = useCallback(() => {
    const transcript = useDictationStore.getState().transcript;
    const note = createNote("Voice Note", transcript || "");
    navigateToNote(note.id);
    return note;
  }, [createNote, navigateToNote]);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteNote(noteId);
    },
    [deleteNote]
  );

  return {
    createNote: handleCreateNote,
    createFromDictation: handleCreateFromDictation,
    deleteNote: handleDeleteNote,
    navigateToNote,
  };
}
