"use client";

import type { MissionTemplate } from "@openplane/types/mission-control";
import {
  SWARM_PRESETS,
  type SwarmPresetId,
} from "@openplane/types/temporal/mission";
import { create } from "zustand";

type AgentDraft = {
  name: string;
  role: string;
  soulPrompt: string;
  tools: string[];
  capabilities: string[];
};

type TaskDraft = {
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2" | "P3";
  dependsOn: string[];
  requiredCapabilities: string[];
};

type MissionCreationState = {
  step: 0 | 1 | 2 | 3;
  objective: string;
  templateId: string | null;
  lane: "linear" | "autonomous" | "hybrid";
  swarmPresetId: SwarmPresetId | null;
  budgetCents: number | null;
  maxConcurrentRuns: number;
  cronSchedule: string | null;
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
  setSwarmPreset: (id: SwarmPresetId) => void;
  setBudgetCents: (cents: number | null) => void;
  setMaxConcurrentRuns: (n: number) => void;
  setCronSchedule: (cron: string | null) => void;
  addAgent: (agent: AgentDraft) => void;
  removeAgent: (index: number) => void;
  updateAgent: (index: number, agent: Partial<AgentDraft>) => void;
  addTask: (task: TaskDraft) => void;
  removeTask: (index: number) => void;
  updateTask: (index: number, task: Partial<TaskDraft>) => void;
  applyTemplate: (template: MissionTemplate) => void;
  clearTemplate: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
};

type MissionCreationStore = MissionCreationState & MissionCreationActions;

const INITIAL_STATE: MissionCreationState = {
  step: 0,
  objective: "",
  templateId: null,
  lane: "autonomous",
  swarmPresetId: null,
  budgetCents: null,
  maxConcurrentRuns: 3,
  cronSchedule: null,
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

  setSwarmPreset: (id) => {
    const preset = SWARM_PRESETS[id];
    set({
      swarmPresetId: id,
      budgetCents: preset.budgetCents,
      maxConcurrentRuns: preset.maxConcurrentRuns,
    });
  },

  setBudgetCents: (budgetCents) => set({ budgetCents }),

  setMaxConcurrentRuns: (maxConcurrentRuns) => set({ maxConcurrentRuns }),

  setCronSchedule: (cronSchedule) => set({ cronSchedule }),

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

  applyTemplate: (template) => {
    const agentCount = template.agents.length;
    let presetId: SwarmPresetId = "swarm";
    if (agentCount <= 5) {
      presetId = "small";
    } else if (agentCount <= 25) {
      presetId = "medium";
    } else if (agentCount <= 100) {
      presetId = "large";
    }
    const preset = SWARM_PRESETS[presetId];

    set({
      step: 3,
      templateId: template.id,
      objective: template.defaultObjective ?? template.description,
      swarmPresetId: presetId,
      budgetCents: preset.budgetCents,
      maxConcurrentRuns: preset.maxConcurrentRuns,
      agents: template.agents.map((a) => ({
        name: a.name,
        role: a.role,
        soulPrompt: a.soulPrompt,
        tools: a.tools,
        capabilities: a.capabilities ?? [],
      })),
      tasks: template.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        dependsOn: t.dependsOn ?? [],
        requiredCapabilities: t.requiredCapabilities ?? [],
      })),
    });
  },

  clearTemplate: () =>
    set({
      templateId: null,
      objective: "",
      agents: [],
      tasks: [],
    }),

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
