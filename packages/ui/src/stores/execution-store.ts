"use client";

import type {
  ExecutionStatus,
  ExecutionTrace,
  StepExecution,
} from "@openplane/types/canvas";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface ExecutionStoreState {
  currentExecution: ExecutionTrace | null;
  executionHistory: ExecutionTrace[];
  isExecuting: boolean;
}

interface ExecutionStoreActions {
  startExecution: (execution: ExecutionTrace) => void;
  updateExecution: (updates: Partial<ExecutionTrace>) => void;
  addStep: (step: StepExecution) => void;
  updateStep: (nodeId: string, updates: Partial<StepExecution>) => void;
  completeExecution: (
    status: ExecutionStatus,
    output?: unknown,
    error?: string
  ) => void;
  clearExecution: () => void;
  reset: () => void;
}

type ExecutionStore = ExecutionStoreState & ExecutionStoreActions;

const initialState: ExecutionStoreState = {
  currentExecution: null,
  executionHistory: [],
  isExecuting: false,
};

export const useExecutionStore = create<ExecutionStore>()(
  immer((set) => ({
    ...initialState,

    startExecution: (execution) =>
      set((state) => {
        state.currentExecution = execution;
        state.isExecuting = true;
      }),

    updateExecution: (updates) =>
      set((state) => {
        if (state.currentExecution) {
          Object.assign(state.currentExecution, updates);
        }
      }),

    addStep: (step) =>
      set((state) => {
        if (state.currentExecution) {
          state.currentExecution.steps.push(step);
          state.currentExecution.currentNodeId = step.nodeId;
        }
      }),

    updateStep: (nodeId, updates) =>
      set((state) => {
        if (state.currentExecution) {
          const step = state.currentExecution.steps.find(
            (s: StepExecution) => s.nodeId === nodeId
          );
          if (step) {
            Object.assign(step, updates);
          }
        }
      }),

    completeExecution: (status, output, error) =>
      set((state) => {
        if (state.currentExecution) {
          state.currentExecution.status = status;
          state.currentExecution.output = output;
          state.currentExecution.error = error;
          state.currentExecution.completedAt = Date.now();
          state.executionHistory.unshift(state.currentExecution);
          state.isExecuting = false;
        }
      }),

    clearExecution: () =>
      set((state) => {
        state.currentExecution = null;
        state.isExecuting = false;
      }),

    reset: () => set(initialState),
  }))
);

export const useCurrentExecution = () =>
  useExecutionStore((s) => s.currentExecution);
export const useIsExecuting = () => useExecutionStore((s) => s.isExecuting);
export const useExecutionHistory = () =>
  useExecutionStore((s) => s.executionHistory);
