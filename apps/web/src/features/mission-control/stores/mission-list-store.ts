"use client";

import { create, type StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type MissionListState = {
  viewMode: "table" | "card";
  sortField: "updatedAt" | "createdAt" | "name" | "status";
  sortDirection: "asc" | "desc";
  columnVisibility: Record<string, boolean>;
  isHydrated: boolean;
};

type MissionListActions = {
  setViewMode: (mode: MissionListState["viewMode"]) => void;
  setSortField: (field: MissionListState["sortField"]) => void;
  setSortDirection: (direction: MissionListState["sortDirection"]) => void;
  setColumnVisibility: (column: string, visible: boolean) => void;
  hydrate: (state: Partial<MissionListState>) => void;
  reset: () => void;
};

type MissionListStore = MissionListState & MissionListActions;

type MissionListPersisted = Pick<
  MissionListState,
  "viewMode" | "sortField" | "sortDirection" | "columnVisibility"
>;

const INITIAL_STATE: MissionListState = {
  viewMode: "table",
  sortField: "updatedAt",
  sortDirection: "desc",
  columnVisibility: {},
  isHydrated: false,
};

const createMissionListSlice: StateCreator<MissionListStore> = (set) => ({
  ...INITIAL_STATE,

  setViewMode: (viewMode) => set({ viewMode }),

  setSortField: (sortField) => set({ sortField }),

  setSortDirection: (sortDirection) => set({ sortDirection }),

  setColumnVisibility: (column, visible) =>
    set((state) => ({
      columnVisibility: { ...state.columnVisibility, [column]: visible },
    })),

  hydrate: (persisted) =>
    set((state) => ({
      ...state,
      ...persisted,
      isHydrated: true,
    })),

  reset: () => set({ ...INITIAL_STATE, isHydrated: true }),
});

type MissionListStoreConfig = {
  skipPersist?: boolean;
};

function createMissionListStore(config: MissionListStoreConfig = {}) {
  if (config.skipPersist) {
    return create<MissionListStore>()(createMissionListSlice);
  }

  return create<MissionListStore>()(
    persist(createMissionListSlice, {
      name: "mission-list-prefs",
      storage: createJSONStorage(() => localStorage),
      partialize: (state): MissionListPersisted => ({
        viewMode: state.viewMode,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        columnVisibility: state.columnVisibility,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    })
  );
}

const useMissionListStore = createMissionListStore();

const useViewMode = () => useMissionListStore((s) => s.viewMode);

const useSortPreferences = () =>
  useMissionListStore((s) => ({
    sortField: s.sortField,
    sortDirection: s.sortDirection,
  }));

export type { MissionListStore, MissionListState, MissionListActions };
export {
  createMissionListStore,
  useMissionListStore,
  useViewMode,
  useSortPreferences,
};
