import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface Transcription {
  id: string;
  text: string;
  durationMs: number;
  language: string;
  createdAt: string;
}

interface TranscriptionStoreState {
  transcriptions: Transcription[];
  isHydrated: boolean;
}

interface TranscriptionStoreActions {
  addTranscription: (
    entry: Omit<Transcription, "id" | "createdAt">
  ) => Transcription;
  deleteTranscription: (id: string) => void;
  clearAll: () => void;
}

type TranscriptionStore = TranscriptionStoreState & TranscriptionStoreActions;

const MAX_HISTORY = 200;

let transcriptionCounter = 0;

function generateTranscriptionId(): string {
  transcriptionCounter += 1;
  return `tx_${Date.now()}_${transcriptionCounter}`;
}

export const useTranscriptionStore = create<TranscriptionStore>()(
  persist(
    (set) => ({
      transcriptions: [],
      isHydrated: false,

      addTranscription: (entry) => {
        const record: Transcription = {
          ...entry,
          id: generateTranscriptionId(),
          createdAt: new Date().toISOString(),
        };
        set((prev) => ({
          transcriptions: [record, ...prev.transcriptions].slice(
            0,
            MAX_HISTORY
          ),
        }));
        return record;
      },

      deleteTranscription: (id) =>
        set((prev) => ({
          transcriptions: prev.transcriptions.filter((t) => t.id !== id),
        })),

      clearAll: () => set({ transcriptions: [] }),
    }),
    {
      name: "openplane-transcriptions",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transcriptions: state.transcriptions,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

export type { Transcription, TranscriptionStoreState };
