"use client";

import { create } from "zustand";

type AgentDraft = {
  name: string;
  role: string;
  soulPrompt: string;
  tools: string[];
};

type TaskDraft = {
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2" | "P3";
};

type MissionCreationState = {
  step: 0 | 1 | 2 | 3;
  objective: string;
  templateId: string | null;
  lane: "linear" | "autonomous" | "hybrid";
  budgetCents: number | null;
  agents: AgentDraft[];
  tasks: TaskDraft[];
  isSubmitting: boolean;
};

type MissionCreationActions = {
  setStep: (step: MissionCreationState["step"]) => void;
  nextStep: () => void;
  prevStep: () => void;
  setObjective: (objective: string) => void;
  setTemplateId: (id: string | null) => void;
  setLane: (lane: MissionCreationState["lane"]) => void;
  setBudgetCents: (cents: number | null) => void;
  addAgent: (agent: AgentDraft) => void;
  removeAgent: (index: number) => void;
  updateAgent: (index: number, agent: Partial<AgentDraft>) => void;
  addTask: (task: TaskDraft) => void;
  removeTask: (index: number) => void;
  updateTask: (index: number, task: Partial<TaskDraft>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
};

type MissionCreationStore = MissionCreationState & MissionCreationActions;

const INITIAL_STATE: MissionCreationState = {
  step: 0,
  objective: "",
  templateId: null,
  lane: "autonomous",
  budgetCents: null,
  agents: [],
  tasks: [],
  isSubmitting: false,
};

const STEP_VALIDATORS: Record<
  MissionCreationState["step"],
  (s: MissionCreationState) => boolean
> = {
  0: (s) => s.objective.trim().length > 0,
  1: (s) => s.agents.length > 0,
  2: (s) => s.tasks.length > 0,
  3: () => true,
};

const useMissionCreationStore = create<MissionCreationStore>((set) => ({
  ...INITIAL_STATE,

  setStep: (step) => set({ step }),

  nextStep: () =>
    set((state) => ({
      step: Math.min(state.step + 1, 3) as MissionCreationState["step"],
    })),

  prevStep: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 0) as MissionCreationState["step"],
    })),

  setObjective: (objective) => set({ objective }),

  setTemplateId: (templateId) => set({ templateId }),

  setLane: (lane) => set({ lane }),

  setBudgetCents: (budgetCents) => set({ budgetCents }),

  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),

  removeAgent: (index) =>
    set((state) => ({
      agents: state.agents.filter((_, i) => i !== index),
    })),

  updateAgent: (index, partial) =>
    set((state) => ({
      agents: state.agents.map((agent, i) =>
        i === index ? { ...agent, ...partial } : agent
      ),
    })),

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  removeTask: (index) =>
    set((state) => ({
      tasks: state.tasks.filter((_, i) => i !== index),
    })),

  updateTask: (index, partial) =>
    set((state) => ({
      tasks: state.tasks.map((task, i) =>
        i === index ? { ...task, ...partial } : task
      ),
    })),

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  reset: () => set(INITIAL_STATE),
}));

const useCreationStep = () => useMissionCreationStore((s) => s.step);

const useCreationAgents = () => useMissionCreationStore((s) => s.agents);

const useCreationTasks = () => useMissionCreationStore((s) => s.tasks);

const useCanProceed = () =>
  useMissionCreationStore((s) => STEP_VALIDATORS[s.step](s));

export type {
  MissionCreationStore,
  MissionCreationState,
  MissionCreationActions,
  AgentDraft,
  TaskDraft,
};
export {
  useMissionCreationStore,
  useCreationStep,
  useCreationAgents,
  useCreationTasks,
  useCanProceed,
};
