"use client";

import type { BuilderStatus, CanvasOperation } from "@openplane/types/canvas";
import { create, type StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";

interface CanvasBuilderState {
  status: BuilderStatus;
  pendingOperations: CanvasOperation[];
  operationHistory: CanvasOperation[];
  errorMessage: string | null;
}

interface CanvasBuilderActions {
  setStatus: (status: BuilderStatus) => void;
  setError: (message: string | null) => void;
  queueOperation: (operation: CanvasOperation) => void;
  queueOperations: (operations: CanvasOperation[]) => void;
  applyOperation: (operation: CanvasOperation) => void;
  applyAllPending: () => CanvasOperation[];
  revertLastOperation: () => CanvasOperation | undefined;
  clearPending: () => void;
  clearHistory: () => void;
  reset: () => void;
}

type CanvasBuilderStore = CanvasBuilderState & CanvasBuilderActions;

const initialState: CanvasBuilderState = {
  status: "idle",
  pendingOperations: [],
  operationHistory: [],
  errorMessage: null,
};

const createCanvasBuilderSlice: StateCreator<
  CanvasBuilderStore,
  [["zustand/immer", never]]
> = (set, get) => ({
  ...initialState,

  setStatus: (status) =>
    set((state) => {
      state.status = status;
      if (status !== "error") {
        state.errorMessage = null;
      }
    }),

  setError: (message) =>
    set((state) => {
      state.errorMessage = message;
      if (message) {
        state.status = "error";
      }
    }),

  queueOperation: (operation) =>
    set((state) => {
      state.pendingOperations.push(operation);
      if (state.status === "idle") {
        state.status = "building";
      }
    }),

  queueOperations: (operations) =>
    set((state) => {
      state.pendingOperations.push(...operations);
      if (state.status === "idle" && operations.length > 0) {
        state.status = "building";
      }
    }),

  applyOperation: (operation) =>
    set((state) => {
      state.operationHistory.push(operation);
      state.pendingOperations = state.pendingOperations.filter(
        (op) => op.id !== operation.id
      );
      if (state.pendingOperations.length === 0) {
        state.status = "idle";
      }
    }),

  applyAllPending: () => {
    const pending = get().pendingOperations;
    set((state) => {
      state.operationHistory.push(...state.pendingOperations);
      state.pendingOperations = [];
      state.status = "idle";
    });
    return pending;
  },

  revertLastOperation: () => {
    const last = get().operationHistory[get().operationHistory.length - 1];
    set((state) => {
      state.operationHistory.pop();
    });
    return last;
  },

  clearPending: () =>
    set((state) => {
      state.pendingOperations = [];
      if (state.status === "building") {
        state.status = "idle";
      }
    }),

  clearHistory: () =>
    set((state) => {
      state.operationHistory = [];
    }),

  reset: () => set(initialState),
});

export const useCanvasBuilderStore = create<CanvasBuilderStore>()(
  immer(createCanvasBuilderSlice)
);

export const useBuilderStatus = () => useCanvasBuilderStore((s) => s.status);

export const usePendingOperations = () =>
  useCanvasBuilderStore((s) => s.pendingOperations);

export const useOperationHistory = () =>
  useCanvasBuilderStore((s) => s.operationHistory);

export const useBuilderError = () =>
  useCanvasBuilderStore((s) => s.errorMessage);

export const useHasPendingOperations = () =>
  useCanvasBuilderStore((s) => s.pendingOperations.length > 0);

export const usePendingOperationCount = () =>
  useCanvasBuilderStore((s) => s.pendingOperations.length);

export type { CanvasBuilderStore, CanvasBuilderState, CanvasBuilderActions };
