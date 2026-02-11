"use client";

import { useCallback, useState } from "react";
import type { AgentDraft, TaskDraft } from "../stores/mission-creation-store";

type PromptToMissionResult = {
  name: string;
  objective: string;
  agents: AgentDraft[];
  tasks: TaskDraft[];
  lane: "linear" | "autonomous" | "hybrid";
};

export function usePromptToMission() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    (prompt: string): PromptToMissionResult | null => {
      setIsGenerating(true);
      try {
        return {
          name: prompt.slice(0, 50),
          objective: prompt,
          agents: [
            {
              name: "Research Lead",
              role: "coordinator",
              soulPrompt: "You are a research coordinator.",
              tools: ["search_hybrid", "doc_get"],
            },
          ],
          tasks: [
            {
              title: "Initial Research",
              description: "",
              priority: "P1" as const,
            },
          ],
          lane: "autonomous" as const,
        };
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generate, isGenerating };
}
