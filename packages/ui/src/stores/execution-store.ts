"use client";

import type {
  ExecutionStatus,
  ExecutionTrace,
  StepExecution,
} from "@openbeam/types/canvas";
import type {
  ExecutionPanelTab,
  ExecutionReplayState,
} from "@openbeam/types/canvas/execution-ui";
import type {
  TimelineFilter,
  TimelineViewMode,
} from "@openbeam/types/canvas/timeline";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface ExecutionPanelState {
  isOpen: boolean;
  activeTab: ExecutionPanelTab;
  selectedStepId: string | undefined;
  timelineViewMode: TimelineViewMode;
  isDetailExpanded: boolean;
}

interface ExecutionStoreState {
  currentExecution: ExecutionTrace | null;
  executionHistory: ExecutionTrace[];
  isExecuting: boolean;
  panel: ExecutionPanelState;
  filter: TimelineFilter;
  replay: ExecutionReplayState;
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
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: ExecutionPanelTab) => void;
  selectStep: (stepId: string | null) => void;
  setViewMode: (mode: TimelineViewMode) => void;
  setDetailExpanded: (expanded: boolean) => void;
  setFilter: (filter: TimelineFilter) => void;
  updateFilter: (updates: Partial<TimelineFilter>) => void;
  startReplay: () => void;
  stopReplay: () => void;
  pauseReplay: () => void;
  resumeReplay: () => void;
  setReplayStep: (index: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  reset: () => void;
}

type ExecutionStore = ExecutionStoreState & ExecutionStoreActions;

const initialPanelState: ExecutionPanelState = {
  isOpen: false,
  activeTab: "timeline",
  selectedStepId: undefined,
  timelineViewMode: "list",
  isDetailExpanded: false,
};

const initialFilter: TimelineFilter = {
  status: undefined,
  nodeTypes: undefined,
  search: undefined,
  showSkipped: true,
  showRetries: false,
};

const initialReplay: ExecutionReplayState = {
  isReplaying: false,
  currentStepIndex: 0,
  playbackSpeed: 1,
  isPaused: false,
};

const initialState: ExecutionStoreState = {
  currentExecution: null,
  executionHistory: [],
  isExecuting: false,
  panel: initialPanelState,
  filter: initialFilter,
  replay: initialReplay,
};

export const useExecutionStore = create<ExecutionStore>()(
  immer((set) => ({
    ...initialState,

    startExecution: (execution) =>
      set((state) => {
        state.currentExecution = execution;
        state.isExecuting = true;
        state.panel.isOpen = true;
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

    openPanel: () =>
      set((state) => {
        state.panel.isOpen = true;
      }),

    closePanel: () =>
      set((state) => {
        state.panel.isOpen = false;
      }),

    togglePanel: () =>
      set((state) => {
        state.panel.isOpen = !state.panel.isOpen;
      }),

    setActiveTab: (tab) =>
      set((state) => {
        state.panel.activeTab = tab;
      }),

    selectStep: (stepId) =>
      set((state) => {
        state.panel.selectedStepId = stepId ?? undefined;
        if (stepId) {
          state.panel.isDetailExpanded = true;
        }
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.panel.timelineViewMode = mode;
      }),

    setDetailExpanded: (expanded) =>
      set((state) => {
        state.panel.isDetailExpanded = expanded;
      }),

    setFilter: (filter) =>
      set((state) => {
        state.filter = filter;
      }),

    updateFilter: (updates) =>
      set((state) => {
        Object.assign(state.filter, updates);
      }),

    startReplay: () =>
      set((state) => {
        state.replay.isReplaying = true;
        state.replay.currentStepIndex = 0;
        state.replay.isPaused = false;
      }),

    stopReplay: () =>
      set((state) => {
        state.replay.isReplaying = false;
        state.replay.currentStepIndex = 0;
        state.replay.isPaused = false;
      }),

    pauseReplay: () =>
      set((state) => {
        state.replay.isPaused = true;
      }),

    resumeReplay: () =>
      set((state) => {
        state.replay.isPaused = false;
      }),

    setReplayStep: (index) =>
      set((state) => {
        state.replay.currentStepIndex = index;
      }),

    setPlaybackSpeed: (speed) =>
      set((state) => {
        state.replay.playbackSpeed = speed;
      }),

    reset: () => set(initialState),
  }))
);

export const useCurrentExecution = () =>
  useExecutionStore((s) => s.currentExecution);
export const useExecutionStatus = () =>
  useExecutionStore((s) => s.currentExecution?.status);
export const useIsExecuting = () => useExecutionStore((s) => s.isExecuting);
export const useExecutionHistory = () =>
  useExecutionStore((s) => s.executionHistory);
export const useExecutionPanelOpen = () =>
  useExecutionStore((s) => s.panel.isOpen);
export const useExecutionPanelTab = () =>
  useExecutionStore((s) => s.panel.activeTab);
export const useExecutionSelectedStep = () =>
  useExecutionStore((s) => s.panel.selectedStepId);
export const useExecutionViewMode = () =>
  useExecutionStore((s) => s.panel.timelineViewMode);
export const useExecutionDetailExpanded = () =>
  useExecutionStore((s) => s.panel.isDetailExpanded);
export const useExecutionFilter = () => useExecutionStore((s) => s.filter);
export const useExecutionReplay = () => useExecutionStore((s) => s.replay);
export const useExecutionReplayState = () =>
  useExecutionStore((s) => ({
    isReplaying: s.replay.isReplaying,
    isPaused: s.replay.isPaused,
    currentStepIndex: s.replay.currentStepIndex,
    playbackSpeed: s.replay.playbackSpeed,
  }));

export type { ExecutionStore, ExecutionPanelState };
