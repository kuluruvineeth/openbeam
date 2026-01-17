"use client";

import type {
  AgentCanvasEdge,
  AgentCanvasNode,
  SelectionState,
  Viewport,
} from "@openplane/types/canvas";
import { create, type StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  createNoopStorageAdapter,
  type StorageAdapter,
} from "./storage-adapters";

interface CanvasStoreState {
  nodes: AgentCanvasNode[];
  edges: AgentCanvasEdge[];
  viewport: Viewport;
  selection: SelectionState;
  isDirty: boolean;
  isHydrated: boolean;
  canvasId: string | null;
}

interface CanvasStoreActions {
  setNodes: (nodes: AgentCanvasNode[]) => void;
  setEdges: (edges: AgentCanvasEdge[]) => void;
  addNode: (node: AgentCanvasNode) => void;
  updateNode: (nodeId: string, data: Partial<AgentCanvasNode["data"]>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: AgentCanvasEdge) => void;
  removeEdge: (edgeId: string) => void;
  setViewport: (viewport: Viewport) => void;
  setSelection: (selection: SelectionState) => void;
  clearSelection: () => void;
  setCanvasId: (id: string | null) => void;
  loadCanvas: (
    nodes: AgentCanvasNode[],
    edges: AgentCanvasEdge[],
    viewport?: Viewport
  ) => void;
  markClean: () => void;
  hydrate: (state: Partial<CanvasStorePersisted>) => void;
  reset: () => void;
}

type CanvasStore = CanvasStoreState & CanvasStoreActions;
type CanvasStorePersisted = Pick<CanvasStoreState, "viewport">;

const initialState: CanvasStoreState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { nodes: [], edges: [] },
  isDirty: false,
  isHydrated: false,
  canvasId: null,
};

const createCanvasStoreSlice: StateCreator<
  CanvasStore,
  [["zustand/immer", never]]
> = (set) => ({
  ...initialState,

  setNodes: (nodes) =>
    set((state) => {
      state.nodes = nodes;
      state.isDirty = true;
    }),

  setEdges: (edges) =>
    set((state) => {
      state.edges = edges;
      state.isDirty = true;
    }),

  addNode: (node) =>
    set((state) => {
      state.nodes.push(node);
      state.isDirty = true;
    }),

  updateNode: (nodeId, data) =>
    set((state) => {
      const node = state.nodes.find((n: AgentCanvasNode) => n.id === nodeId);
      if (node) {
        node.data = { ...node.data, ...data };
        state.isDirty = true;
      }
    }),

  removeNode: (nodeId) =>
    set((state) => {
      state.nodes = state.nodes.filter((n: AgentCanvasNode) => n.id !== nodeId);
      state.edges = state.edges.filter(
        (e: AgentCanvasEdge) => e.source !== nodeId && e.target !== nodeId
      );
      state.isDirty = true;
    }),

  addEdge: (edge) =>
    set((state) => {
      state.edges.push(edge);
      state.isDirty = true;
    }),

  removeEdge: (edgeId) =>
    set((state) => {
      state.edges = state.edges.filter((e: AgentCanvasEdge) => e.id !== edgeId);
      state.isDirty = true;
    }),

  setViewport: (viewport) =>
    set((state) => {
      state.viewport = viewport;
    }),

  setSelection: (selection) =>
    set((state) => {
      state.selection = selection;
    }),

  clearSelection: () =>
    set((state) => {
      state.selection = { nodes: [], edges: [] };
    }),

  setCanvasId: (id) =>
    set((state) => {
      state.canvasId = id;
    }),

  loadCanvas: (nodes, edges, viewport) =>
    set((state) => {
      state.nodes = nodes;
      state.edges = edges;
      if (viewport) {
        state.viewport = viewport;
      }
      state.isDirty = false;
    }),

  markClean: () =>
    set((state) => {
      state.isDirty = false;
    }),

  hydrate: (persisted) =>
    set((state) => ({
      ...state,
      ...persisted,
      isHydrated: true,
    })),

  reset: () => set(initialState),
});

interface CanvasStoreConfig {
  storage?: StorageAdapter | "localStorage" | "memory" | "none";
  storageKey?: string;
}

function createCanvasZustandStorage(adapter: StorageAdapter) {
  return createJSONStorage<CanvasStorePersisted>(() => ({
    getItem: (name) => {
      const result = adapter.getItem(name);
      if (result instanceof Promise) {
        return result.then((v) => (v ? JSON.stringify(v) : null));
      }
      return result ? JSON.stringify(result) : null;
    },
    setItem: (name, value) => {
      const parsed = JSON.parse(value) as CanvasStorePersisted;
      adapter.setItem(name, parsed as Record<string, unknown>);
    },
    removeItem: (name) => {
      adapter.removeItem(name);
    },
  }));
}

function resolveCanvasStorageAdapter(
  storage: CanvasStoreConfig["storage"]
): StorageAdapter {
  if (!storage || storage === "localStorage") {
    return createLocalStorageAdapter();
  }
  if (storage === "none") {
    return createNoopStorageAdapter();
  }
  if (storage === "memory") {
    return createMemoryStorageAdapter();
  }
  return storage;
}

export function createCanvasStore(config: CanvasStoreConfig = {}) {
  const adapter = resolveCanvasStorageAdapter(config.storage);

  return create<CanvasStore>()(
    persist(immer(createCanvasStoreSlice), {
      name: config.storageKey ?? "canvas-store",
      storage: createCanvasZustandStorage(adapter),
      partialize: (state) => ({ viewport: state.viewport }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    })
  );
}

export const useCanvasStore = createCanvasStore();

export const useCanvasNodes = () => useCanvasStore((s) => s.nodes);
export const useCanvasEdges = () => useCanvasStore((s) => s.edges);
export const useCanvasViewport = () => useCanvasStore((s) => s.viewport);
export const useCanvasSelection = () => useCanvasStore((s) => s.selection);
export const useCanvasIsDirty = () => useCanvasStore((s) => s.isDirty);
export const useCanvasIsHydrated = () => useCanvasStore((s) => s.isHydrated);

export type { CanvasStore, CanvasStoreConfig, CanvasStorePersisted };
