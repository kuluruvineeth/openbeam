"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildExplorerCheckoutKey,
  coerceExplorerTabForCheckout,
  type ExplorerTab,
  isExplorerTab,
  resolveExplorerTabForCheckout,
} from "./explorer-tab-memory";

export type { ExplorerTab } from "./explorer-tab-memory";

export type SortOption = "name" | "modified" | "size";

export interface ExplorerCheckoutContext {
  serverId: string;
  cwd: string;
  isGit: boolean;
}

export const DEFAULT_EXPLORER_SIDEBAR_WIDTH = 640;
export const MIN_EXPLORER_SIDEBAR_WIDTH = 280;
export const MAX_EXPLORER_SIDEBAR_WIDTH = 2000;

export const DEFAULT_EXPLORER_FILES_SPLIT_RATIO = 0.38;
export const MIN_EXPLORER_FILES_SPLIT_RATIO = 0.2;
export const MAX_EXPLORER_FILES_SPLIT_RATIO = 0.8;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function clampWidth(width: number): number {
  return clampNumber(
    width,
    MIN_EXPLORER_SIDEBAR_WIDTH,
    MAX_EXPLORER_SIDEBAR_WIDTH
  );
}

function clampSplitRatio(ratio: number): number {
  return clampNumber(
    ratio,
    MIN_EXPLORER_FILES_SPLIT_RATIO,
    MAX_EXPLORER_FILES_SPLIT_RATIO
  );
}

interface SidebarState {
  agentListOpen: boolean;
  fileExplorerOpen: boolean;
}

interface PanelState {
  sidebar: SidebarState;
  explorerTab: ExplorerTab;
  explorerTabByCheckout: Record<string, ExplorerTab>;
  activeExplorerCheckout: ExplorerCheckoutContext | null;
  explorerWidth: number;
  explorerSortOption: SortOption;
  explorerFilesSplitRatio: number;

  openAgentList: () => void;
  closeAgentList: () => void;
  openFileExplorer: () => void;
  closeFileExplorer: () => void;
  toggleAgentList: () => void;
  toggleFileExplorer: () => void;

  setExplorerTab: (tab: ExplorerTab) => void;
  setExplorerTabForCheckout: (
    params: ExplorerCheckoutContext & { tab: ExplorerTab }
  ) => void;
  activateExplorerTabForCheckout: (checkout: ExplorerCheckoutContext) => void;
  setActiveExplorerCheckout: (checkout: ExplorerCheckoutContext | null) => void;
  setExplorerWidth: (width: number) => void;
  setExplorerSortOption: (option: SortOption) => void;
  setExplorerFilesSplitRatio: (ratio: number) => void;
}

function resolveTabFromActiveCheckout(state: PanelState): ExplorerTab | null {
  if (!state.activeExplorerCheckout) {
    return null;
  }
  return resolveExplorerTabForCheckout({
    serverId: state.activeExplorerCheckout.serverId,
    cwd: state.activeExplorerCheckout.cwd,
    isGit: state.activeExplorerCheckout.isGit,
    explorerTabByCheckout: state.explorerTabByCheckout,
  });
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      sidebar: {
        agentListOpen: true,
        fileExplorerOpen: true,
      },
      explorerTab: "changes",
      explorerTabByCheckout: {},
      activeExplorerCheckout: null,
      explorerWidth: DEFAULT_EXPLORER_SIDEBAR_WIDTH,
      explorerSortOption: "name",
      explorerFilesSplitRatio: DEFAULT_EXPLORER_FILES_SPLIT_RATIO,

      openAgentList: () =>
        set((state) => ({
          sidebar: { ...state.sidebar, agentListOpen: true },
        })),

      closeAgentList: () =>
        set((state) => ({
          sidebar: { ...state.sidebar, agentListOpen: false },
        })),

      openFileExplorer: () =>
        set((state) => {
          const resolvedTab = resolveTabFromActiveCheckout(state);
          return {
            sidebar: { ...state.sidebar, fileExplorerOpen: true },
            ...(resolvedTab ? { explorerTab: resolvedTab } : {}),
          };
        }),

      closeFileExplorer: () =>
        set((state) => ({
          sidebar: { ...state.sidebar, fileExplorerOpen: false },
        })),

      toggleAgentList: () =>
        set((state) => ({
          sidebar: {
            ...state.sidebar,
            agentListOpen: !state.sidebar.agentListOpen,
          },
        })),

      toggleFileExplorer: () =>
        set((state) => {
          const willOpen = !state.sidebar.fileExplorerOpen;
          const next: Partial<PanelState> = {
            sidebar: { ...state.sidebar, fileExplorerOpen: willOpen },
          };
          if (willOpen) {
            const resolvedTab = resolveTabFromActiveCheckout(state);
            if (resolvedTab) {
              next.explorerTab = resolvedTab;
            }
          }
          return next;
        }),

      setExplorerTab: (tab) => set({ explorerTab: tab }),

      setExplorerTabForCheckout: ({ serverId, cwd, isGit, tab }) =>
        set((state) => {
          const resolvedTab = coerceExplorerTabForCheckout(tab, isGit);
          const key = buildExplorerCheckoutKey(serverId, cwd);
          const nextState: Partial<PanelState> = {
            explorerTab: resolvedTab,
          };
          if (key) {
            const current = state.explorerTabByCheckout[key];
            if (current !== resolvedTab) {
              nextState.explorerTabByCheckout = {
                ...state.explorerTabByCheckout,
                [key]: resolvedTab,
              };
            }
          }
          return nextState;
        }),

      activateExplorerTabForCheckout: (checkout) =>
        set((state) => ({
          activeExplorerCheckout: checkout,
          explorerTab: resolveExplorerTabForCheckout({
            serverId: checkout.serverId,
            cwd: checkout.cwd,
            isGit: checkout.isGit,
            explorerTabByCheckout: state.explorerTabByCheckout,
          }),
        })),

      setActiveExplorerCheckout: (checkout) =>
        set((state) => {
          const current = state.activeExplorerCheckout;
          if (
            current?.serverId === checkout?.serverId &&
            current?.cwd === checkout?.cwd &&
            current?.isGit === checkout?.isGit
          ) {
            return state;
          }
          return { activeExplorerCheckout: checkout };
        }),

      setExplorerWidth: (width) => set({ explorerWidth: clampWidth(width) }),

      setExplorerSortOption: (option) => set({ explorerSortOption: option }),

      setExplorerFilesSplitRatio: (ratio) =>
        set({
          explorerFilesSplitRatio: Number.isFinite(ratio)
            ? clampSplitRatio(ratio)
            : DEFAULT_EXPLORER_FILES_SPLIT_RATIO,
        }),
    }),
    {
      name: "openbeam-daemon-panel",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<PanelState> &
          Record<string, unknown>;

        if (version < 2) {
          if (
            typeof state.explorerTabByCheckout !== "object" ||
            !state.explorerTabByCheckout
          ) {
            state.explorerTabByCheckout = {};
          } else {
            const entries = Object.entries(
              state.explorerTabByCheckout as Record<string, unknown>
            );
            const next: Record<string, ExplorerTab> = {};
            for (const [key, value] of entries) {
              if (isExplorerTab(value)) {
                next[key] = value;
              }
            }
            state.explorerTabByCheckout = next;
          }
          state.activeExplorerCheckout = null;
        }

        return state as PanelState;
      },
      partialize: (state) => ({
        sidebar: state.sidebar,
        explorerTab: state.explorerTab,
        explorerTabByCheckout: state.explorerTabByCheckout,
        explorerWidth: state.explorerWidth,
        explorerSortOption: state.explorerSortOption,
        explorerFilesSplitRatio: state.explorerFilesSplitRatio,
      }),
    }
  )
);
