"use client";

import { Button } from "@openplane/ui";
import {
  ENABLE_THINKING_MOCK,
  getMockThinkingProps,
  useMockThinking,
} from "@/lib/thinking-mock";
import { ThinkingDisplay } from "./thinking-display";

type ThinkingDemoProps = {
  mode?: "static" | "animated";
};

export function ThinkingDemo({ mode = "animated" }: ThinkingDemoProps) {
  if (!ENABLE_THINKING_MOCK) {
    return null;
  }

  if (mode === "static") {
    return <ThinkingDemoStatic />;
  }

  return <ThinkingDemoAnimated />;
}

function ThinkingDemoStatic() {
  const { thinking, steps } = getMockThinkingProps();

  return (
    <div className="border border-openplane-blue/30 border-dashed bg-openplane-blue/5 p-4">
      <div className="mb-2 font-mono text-[10px] text-openplane-blue">
        [DEV] Static Thinking Demo
      </div>
      <ThinkingDisplay steps={steps} thinking={thinking} />
    </div>
  );
}

function ThinkingDemoAnimated() {
  const { thinking, steps, phase, start, reset } = useMockThinking();

  return (
    <div className="border border-openplane-blue/30 border-dashed bg-openplane-blue/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[10px] text-openplane-blue">
          [DEV] Animated Thinking Demo — Phase: {phase}
        </div>
        <div className="flex gap-2">
          <Button onClick={start} size="sm" variant="outline">
            Start
          </Button>
          <Button onClick={reset} size="sm" variant="ghost">
            Reset
          </Button>
        </div>
      </div>
      <ThinkingDisplay steps={steps} thinking={thinking} />
    </div>
  );
}

ThinkingDemo.displayName = "ThinkingDemo";
