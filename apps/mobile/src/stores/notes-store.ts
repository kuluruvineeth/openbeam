import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface Note {
  id: string;
  title: string;
  emoji: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesStoreState {
  notes: Note[];
  activeNoteId: string | null;
  isHydrated: boolean;
}

interface NotesStoreActions {
  createNote: (title?: string, initialContent?: string) => Note;
  updateNote: (
    id: string,
    patch: Partial<Omit<Note, "id" | "createdAt">>
  ) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
}

type NotesStore = NotesStoreState & NotesStoreActions;

let noteCounter = 0;

function generateNoteId(): string {
  noteCounter += 1;
  return `note_${Date.now()}_${noteCounter}`;
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set, _get) => ({
      notes: [],
      activeNoteId: null,
      isHydrated: false,

      createNote: (title, initialContent) => {
        const now = new Date().toISOString();
        const note: Note = {
          id: generateNoteId(),
          title: title || "Untitled",
          emoji: null,
          content: initialContent || "",
          createdAt: now,
          updatedAt: now,
        };
        set((prev) => ({
          notes: [note, ...prev.notes],
          activeNoteId: note.id,
        }));
        return note;
      },

      updateNote: (id, patch) =>
        set((prev) => {
          const idx = prev.notes.findIndex((n) => n.id === id);
          if (idx === -1) {
            return prev;
          }
          const updated = {
            ...prev.notes[idx],
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          const next = [...prev.notes];
          next[idx] = updated;
          return { notes: next };
        }),

      deleteNote: (id) =>
        set((prev) => ({
          notes: prev.notes.filter((n) => n.id !== id),
          activeNoteId: prev.activeNoteId === id ? null : prev.activeNoteId,
        })),

      setActiveNote: (id) =>
        set((prev) => {
          if (prev.activeNoteId === id) {
            return prev;
          }
          return { activeNoteId: id };
        }),
    }),
    {
      name: "openplane-notes",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notes: state.notes,
        activeNoteId: state.activeNoteId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

export type { Note, NotesStoreState };
