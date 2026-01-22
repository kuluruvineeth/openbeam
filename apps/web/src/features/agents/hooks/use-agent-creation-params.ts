"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

const agentCreationParsers = {
  agent: parseAsString,
  step: parseAsInteger.withDefault(1),
};

export function useAgentCreationParams() {
  const [params, setParams] = useQueryStates(agentCreationParsers, {
    shallow: false,
    history: "push",
  });

  const isOpen = params.agent !== null;
  const isEditMode = params.agent !== null && params.agent !== "new";
  const editingAgentId = isEditMode ? params.agent : null;
  const currentStep = params.step;

  const open = () => {
    setParams({ agent: "new", step: 1 });
  };

  const openEdit = (agentId: string) => {
    setParams({ agent: agentId, step: 1 });
  };

  const close = () => {
    setParams({ agent: null, step: null });
  };

  const nextStep = () => {
    setParams((prev) => ({ ...prev, step: Math.min((prev.step ?? 1) + 1, 4) }));
  };

  const prevStep = () => {
    setParams((prev) => ({ ...prev, step: Math.max((prev.step ?? 1) - 1, 1) }));
  };

  const goToStep = (step: number) => {
    setParams((prev) => ({ ...prev, step }));
  };

  return {
    isOpen,
    isEditMode,
    editingAgentId,
    currentStep,
    open,
    openEdit,
    close,
    nextStep,
    prevStep,
    goToStep,
    setParams,
  };
}
