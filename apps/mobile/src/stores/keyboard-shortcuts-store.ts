import { create } from "zustand";
import type { MessageInputKeyboardActionKind } from "@/keyboard/actions";

export type MessageInputActionRequest = {
  id: number;
  agentKey: string;
  kind: MessageInputKeyboardActionKind;
};

export type DictationActivity = {
  agentKey: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  updatedAtMs: number;
  lastReporterAgentKey: string | null;
};

const EMPTY_DICTATION_ACTIVITY: DictationActivity = {
  agentKey: null,
  isRecording: false,
  isProcessing: false,
  updatedAtMs: 0,
  lastReporterAgentKey: null,
};

interface KeyboardShortcutsState {
  commandCenterOpen: boolean;
  shortcutsDialogOpen: boolean;
  altDown: boolean;
  cmdOrCtrlDown: boolean;
  selectedOrRouteAgentKey: string | null;
  /** Sidebar-visible agent keys (up to 9), in top-to-bottom visual order. */
  sidebarShortcutAgentKeys: string[];
  messageInputActionRequest: MessageInputActionRequest | null;
  messageInputActionQueue: MessageInputActionRequest[];
  messageInputActionNextId: number;
  dictationActivity: DictationActivity;

  setCommandCenterOpen: (open: boolean) => void;
  setShortcutsDialogOpen: (open: boolean) => void;
  setAltDown: (down: boolean) => void;
  setCmdOrCtrlDown: (down: boolean) => void;
  setSelectedOrRouteAgentKey: (agentKey: string | null) => void;
  setSidebarShortcutAgentKeys: (keys: string[]) => void;
  resetModifiers: () => void;

  requestMessageInputAction: (input: {
    agentKey: string;
    kind: MessageInputKeyboardActionKind;
  }) => void;
  clearMessageInputActionRequest: (id: number) => void;
  reportDictationActivity: (input: {
    agentKey: string;
    isRecording: boolean;
    isProcessing: boolean;
    nowMs?: number;
  }) => void;
  clearDictationActivity: (agentKey: string, nowMs?: number) => void;
}

export const useKeyboardShortcutsStore = create<KeyboardShortcutsState>(
  (set, get) => ({
    commandCenterOpen: false,
    shortcutsDialogOpen: false,
    altDown: false,
    cmdOrCtrlDown: false,
    selectedOrRouteAgentKey: null,
    sidebarShortcutAgentKeys: [],
    messageInputActionRequest: null,
    messageInputActionQueue: [],
    messageInputActionNextId: 0,
    dictationActivity: { ...EMPTY_DICTATION_ACTIVITY },

    setCommandCenterOpen: (open) => set({ commandCenterOpen: open }),
    setShortcutsDialogOpen: (open) => set({ shortcutsDialogOpen: open }),
    setAltDown: (down) => set({ altDown: down }),
    setCmdOrCtrlDown: (down) => set({ cmdOrCtrlDown: down }),
    setSelectedOrRouteAgentKey: (agentKey) =>
      set({
        selectedOrRouteAgentKey: agentKey?.trim() ? agentKey.trim() : null,
      }),
    setSidebarShortcutAgentKeys: (keys) =>
      set({ sidebarShortcutAgentKeys: keys }),
    resetModifiers: () => set({ altDown: false, cmdOrCtrlDown: false }),

    requestMessageInputAction: ({ agentKey, kind }) => {
      set((state) => {
        const id = state.messageInputActionNextId + 1;
        const request = { id, agentKey, kind };

        if (!state.messageInputActionRequest) {
          return {
            messageInputActionRequest: request,
            messageInputActionQueue: state.messageInputActionQueue,
            messageInputActionNextId: id,
          };
        }

        return {
          messageInputActionRequest: state.messageInputActionRequest,
          messageInputActionQueue: [...state.messageInputActionQueue, request],
          messageInputActionNextId: id,
        };
      });
    },
    clearMessageInputActionRequest: (id) => {
      const current = get().messageInputActionRequest;
      if (!current || current.id !== id) {
        return;
      }
      set((state) => {
        const [nextRequest, ...remaining] = state.messageInputActionQueue;
        return {
          messageInputActionRequest: nextRequest ?? null,
          messageInputActionQueue: remaining,
          messageInputActionNextId: state.messageInputActionNextId,
        };
      });
    },
    reportDictationActivity: ({
      agentKey,
      isRecording,
      isProcessing,
      nowMs,
    }) => {
      const key = agentKey.trim();
      if (!key) {
        return;
      }
      const isActive = isRecording || isProcessing;
      const normalizedNowMs =
        typeof nowMs === "number" && Number.isFinite(nowMs)
          ? Math.floor(nowMs)
          : Date.now();

      set((state) => {
        const current = state.dictationActivity;

        if (!isActive) {
          if (current.agentKey !== key) {
            return {
              dictationActivity: {
                ...current,
                updatedAtMs: normalizedNowMs,
                lastReporterAgentKey: key,
              },
            };
          }
          return {
            dictationActivity: {
              agentKey: null,
              isRecording: false,
              isProcessing: false,
              updatedAtMs: normalizedNowMs,
              lastReporterAgentKey: key,
            },
          };
        }

        return {
          dictationActivity: {
            agentKey: key,
            isRecording,
            isProcessing,
            updatedAtMs: normalizedNowMs,
            lastReporterAgentKey: key,
          },
        };
      });
    },
    clearDictationActivity: (agentKey, nowMs) => {
      const key = agentKey.trim();
      if (!key) {
        return;
      }
      const normalizedNowMs =
        typeof nowMs === "number" && Number.isFinite(nowMs)
          ? Math.floor(nowMs)
          : Date.now();

      set((state) => {
        const current = state.dictationActivity;
        if (current.agentKey !== key) {
          return {
            dictationActivity: {
              ...current,
              updatedAtMs: normalizedNowMs,
              lastReporterAgentKey: key,
            },
          };
        }
        return {
          dictationActivity: {
            agentKey: null,
            isRecording: false,
            isProcessing: false,
            updatedAtMs: normalizedNowMs,
            lastReporterAgentKey: key,
          },
        };
      });
    },
  })
);
