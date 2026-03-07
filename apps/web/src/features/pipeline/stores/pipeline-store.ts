"use client";

import { createLocalStorageAdapter } from "@openbeam/ui";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_COLUMNS } from "../constants";
import type {
  PipelineColumn,
  PipelineFilterState,
  PipelineViewMode,
} from "../types";

type PipelineStoreState = {
  columns: PipelineColumn[];
  viewMode: PipelineViewMode;
  filters: PipelineFilterState;
  focusedCardId: string | null;
  focusedColumnIndex: number;
  isHydrated: boolean;
};

type PipelineStoreActions = {
  setColumns: (columns: PipelineColumn[]) => void;
  addColumn: (column: PipelineColumn) => void;
  removeColumn: (columnId: string) => void;
  setViewMode: (mode: PipelineViewMode) => void;
  setSearch: (search: string) => void;
  toggleTag: (tag: string) => void;
  toggleAssignee: (assigneeId: string) => void;
  clearFilters: () => void;
  setFocusedCard: (cardId: string | null) => void;
  setFocusedColumnIndex: (index: number) => void;
  hydrate: (state: Partial<PipelineStorePersisted>) => void;
  reset: () => void;
};

type PipelineStore = PipelineStoreState & PipelineStoreActions;

type PipelineStorePersisted = Pick<PipelineStoreState, "columns" | "viewMode">;

const INITIAL_FILTERS: PipelineFilterState = {
  search: "",
  tags: [],
  assigneeIds: [],
};

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set) => ({
      columns: DEFAULT_COLUMNS,
      viewMode: "kanban",
      filters: INITIAL_FILTERS,
      focusedCardId: null,
      focusedColumnIndex: 0,
      isHydrated: false,

      setColumns: (columns) => set({ columns }),

      addColumn: (column) =>
        set((state) => ({ columns: [...state.columns, column] })),

      removeColumn: (columnId) =>
        set((state) => ({
          columns: state.columns.filter((c) => c.id !== columnId),
        })),

      setViewMode: (viewMode) => set({ viewMode }),

      setSearch: (search) =>
        set((state) => ({ filters: { ...state.filters, search } })),

      toggleTag: (tag) =>
        set((state) => {
          const tags = state.filters.tags.includes(tag)
            ? state.filters.tags.filter((t) => t !== tag)
            : [...state.filters.tags, tag];
          return { filters: { ...state.filters, tags } };
        }),

      toggleAssignee: (assigneeId) =>
        set((state) => {
          const assigneeIds = state.filters.assigneeIds.includes(assigneeId)
            ? state.filters.assigneeIds.filter((id) => id !== assigneeId)
            : [...state.filters.assigneeIds, assigneeId];
          return { filters: { ...state.filters, assigneeIds } };
        }),

      clearFilters: () => set({ filters: INITIAL_FILTERS }),

      setFocusedCard: (focusedCardId) => set({ focusedCardId }),

      setFocusedColumnIndex: (focusedColumnIndex) =>
        set({ focusedColumnIndex }),

      hydrate: (persisted) =>
        set((state) => ({ ...state, ...persisted, isHydrated: true })),

      reset: () =>
        set({
          columns: DEFAULT_COLUMNS,
          viewMode: "kanban",
          filters: INITIAL_FILTERS,
          focusedCardId: null,
          focusedColumnIndex: 0,
          isHydrated: true,
        }),
    }),
    {
      name: "openbeam-pipeline",
      storage: createJSONStorage(() => {
        const adapter = createLocalStorageAdapter();
        return {
          getItem: (name) => {
            const result = adapter.getItem(name);
            return result ? JSON.stringify(result) : null;
          },
          setItem: (name, value) => {
            adapter.setItem(name, JSON.parse(value) as Record<string, unknown>);
          },
          removeItem: (name) => {
            adapter.removeItem(name);
          },
        };
      }),
      partialize: (state): PipelineStorePersisted => ({
        columns: state.columns,
        viewMode: state.viewMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
