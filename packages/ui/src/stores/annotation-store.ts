"use client";

import type { SpatialAnnotation } from "@openbeam/types/canvas";
import { create, type StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";

interface AnnotationStoreState {
  annotations: SpatialAnnotation[];
  activeAnnotationId: string | null;
  isHydrated: boolean;
}

interface AnnotationStoreActions {
  addAnnotation: (annotation: SpatialAnnotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<SpatialAnnotation>) => void;
  clearAnnotations: () => void;
  getAnnotationsInRegion: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => SpatialAnnotation[];
  getAnnotationsForNode: (nodeId: string) => SpatialAnnotation[];
  setActiveAnnotation: (id: string | null) => void;
  reset: () => void;
}

type AnnotationStore = AnnotationStoreState & AnnotationStoreActions;

const initialState: AnnotationStoreState = {
  annotations: [],
  activeAnnotationId: null,
  isHydrated: true,
};

function pointInBounds(
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

const createAnnotationStoreSlice: StateCreator<
  AnnotationStore,
  [["zustand/immer", never]]
> = (set, get) => ({
  ...initialState,

  addAnnotation: (annotation) =>
    set((state) => {
      state.annotations.push(annotation);
    }),

  removeAnnotation: (id) =>
    set((state) => {
      state.annotations = state.annotations.filter(
        (a: SpatialAnnotation) => a.id !== id
      );
      if (state.activeAnnotationId === id) {
        state.activeAnnotationId = null;
      }
    }),

  updateAnnotation: (id, updates) =>
    set((state) => {
      const annotation = state.annotations.find(
        (a: SpatialAnnotation) => a.id === id
      );
      if (annotation) {
        Object.assign(annotation, updates);
      }
    }),

  clearAnnotations: () =>
    set((state) => {
      state.annotations = [];
      state.activeAnnotationId = null;
    }),

  getAnnotationsInRegion: (bounds) =>
    get().annotations.filter((annotation) =>
      annotation.points.some((point) => pointInBounds(point, bounds))
    ),

  getAnnotationsForNode: (nodeId) =>
    get().annotations.filter((annotation) =>
      annotation.intersectingNodes.includes(nodeId)
    ),

  setActiveAnnotation: (id) =>
    set((state) => {
      state.activeAnnotationId = id;
    }),

  reset: () => set(initialState),
});

export const useAnnotationStore = create<AnnotationStore>()(
  immer(createAnnotationStoreSlice)
);

export const useAnnotations = () => useAnnotationStore((s) => s.annotations);

export const useActiveAnnotationId = () =>
  useAnnotationStore((s) => s.activeAnnotationId);

export const useActiveAnnotation = () =>
  useAnnotationStore(
    (s) =>
      s.annotations.find(
        (a: SpatialAnnotation) => a.id === s.activeAnnotationId
      ) ?? null
  );

export const useAnnotationCount = () =>
  useAnnotationStore((s) => s.annotations.length);

export type { AnnotationStore, AnnotationStoreActions, AnnotationStoreState };
