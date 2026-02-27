import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface DraftInput {
  text: string;
  images: Array<{ uri: string; mimeType: string }>;
}

interface DraftStoreState {
  drafts: Record<string, DraftInput>;
  createModalDraft: DraftInput | null;
}

interface DraftStoreActions {
  getDraftInput: (agentId: string) => DraftInput | undefined;
  saveDraftInput: (agentId: string, draft: DraftInput) => void;
  clearDraftInput: (agentId: string) => void;
  getCreateModalDraft: () => DraftInput | null;
  saveCreateModalDraft: (draft: DraftInput | null) => void;
}

type DraftStore = DraftStoreState & DraftStoreActions;

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      createModalDraft: null,

      getDraftInput: (agentId) => get().drafts[agentId],

      saveDraftInput: (agentId, draft) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [agentId]: draft,
          },
        }));
      },

      clearDraftInput: (agentId) => {
        set((state) => {
          const { [agentId]: _, ...rest } = state.drafts;
          return { drafts: rest };
        });
      },

      getCreateModalDraft: () => get().createModalDraft,

      saveCreateModalDraft: (draft) => {
        set({ createModalDraft: draft });
      },
    }),
    {
      name: "openplane-drafts",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
