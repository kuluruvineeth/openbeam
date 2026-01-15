import { useCallback, useEffect, useRef, useState } from "react";
import type { ThinkingState, ThinkingStep } from "./thinking-types";

export const ENABLE_THINKING_MOCK = true;

const MOCK_THINKING_CONTENT = `Let me analyze this query step by step.

First, I need to understand what the user is looking for. They seem to be searching for information about quarterly roadmaps and project planning.

I'll search across multiple data sources:
- Notion documents for planning docs
- Slack conversations for recent discussions
- Google Drive for shared presentations

The search results show several relevant documents. I'm now synthesizing the key findings...

Based on my analysis, I found 3 highly relevant documents that discuss the Q4 roadmap, including timelines, milestones, and team assignments.`;

const MOCK_STEPS: ThinkingStep[] = [
  {
    id: "step-1",
    name: "analyze_query",
    displayName: "Analyzing query",
    status: "completed",
    durationMs: 234,
  },
  {
    id: "step-2",
    name: "search_hybrid",
    displayName: "Searching knowledge base (12 sources)",
    status: "completed",
    durationMs: 1456,
  },
  {
    id: "step-3",
    name: "build_context",
    displayName: "Building context",
    status: "completed",
    durationMs: 312,
  },
  {
    id: "step-4",
    name: "rag_answer",
    displayName: "Generating answer",
    status: "completed",
    durationMs: 2103,
  },
];

export const MOCK_THINKING_COMPLETE: ThinkingState = {
  content: MOCK_THINKING_CONTENT,
  isActive: false,
  startTime: Date.now() - 4500,
  endTime: Date.now(),
  durationMs: 4500,
};

export const MOCK_STEPS_COMPLETE: ThinkingStep[] = MOCK_STEPS;

type MockPhase =
  | "idle"
  | "thinking"
  | "searching"
  | "synthesizing"
  | "complete";

type UseMockThinkingReturn = {
  thinking: ThinkingState;
  steps: ThinkingStep[];
  phase: MockPhase;
  start: () => void;
  reset: () => void;
};

export function useMockThinking(): UseMockThinkingReturn {
  const [phase, setPhase] = useState<MockPhase>("idle");
  const [thinking, setThinking] = useState<ThinkingState>({
    content: "",
    isActive: false,
    startTime: null,
    endTime: null,
    durationMs: null,
  });
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const contentIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearIntervals = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearTimeouts = useCallback(() => {
    for (const timeoutId of timeoutRefs.current) {
      clearTimeout(timeoutId);
    }
    timeoutRefs.current = [];
  }, []);

  const reset = useCallback(() => {
    clearIntervals();
    clearTimeouts();
    contentIndexRef.current = 0;
    setPhase("idle");
    setThinking({
      content: "",
      isActive: false,
      startTime: null,
      endTime: null,
      durationMs: null,
    });
    setSteps([]);
  }, [clearIntervals, clearTimeouts]);

  const start = useCallback(() => {
    reset();
    setPhase("thinking");
    const startTime = performance.now();

    setThinking({
      content: "",
      isActive: true,
      startTime,
      endTime: null,
      durationMs: null,
    });

    intervalRef.current = setInterval(() => {
      contentIndexRef.current += 3;
      const currentContent = MOCK_THINKING_CONTENT.slice(
        0,
        contentIndexRef.current
      );

      setThinking((prev) => ({
        ...prev,
        content: currentContent,
      }));

      if (contentIndexRef.current >= MOCK_THINKING_CONTENT.length) {
        clearIntervals();
        const endTime = performance.now();
        setThinking((prev) => ({
          ...prev,
          isActive: false,
          endTime,
          durationMs: endTime - startTime,
        }));
        setPhase("complete");
      }
    }, 30);

    timeoutRefs.current.push(
      setTimeout(() => {
        setSteps([{ ...MOCK_STEPS[0], status: "active" }]);
      }, 200)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        setSteps([
          { ...MOCK_STEPS[0], status: "completed" },
          { ...MOCK_STEPS[1], status: "active" },
        ]);
        setPhase("searching");
      }, 800)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        setSteps([
          { ...MOCK_STEPS[0], status: "completed" },
          { ...MOCK_STEPS[1], status: "completed" },
          { ...MOCK_STEPS[2], status: "active" },
        ]);
      }, 2000)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        setSteps([
          { ...MOCK_STEPS[0], status: "completed" },
          { ...MOCK_STEPS[1], status: "completed" },
          { ...MOCK_STEPS[2], status: "completed" },
          { ...MOCK_STEPS[3], status: "active" },
        ]);
        setPhase("synthesizing");
      }, 2800)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        setSteps(
          MOCK_STEPS.map((s) => ({ ...s, status: "completed" as const }))
        );
      }, 4200)
    );
  }, [reset, clearIntervals]);

  useEffect(
    () => () => {
      clearIntervals();
      clearTimeouts();
    },
    [clearIntervals, clearTimeouts]
  );

  return { thinking, steps, phase, start, reset };
}

export function getMockThinkingProps() {
  return {
    thinking: MOCK_THINKING_COMPLETE,
    steps: MOCK_STEPS_COMPLETE,
  };
}
