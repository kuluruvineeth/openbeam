"use client";

import { cva } from "class-variance-authority";
import { useVoiceStore } from "../stores/voice-store";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-medium text-[11px] uppercase tracking-wider transition-colors",
  {
    variants: {
      mode: {
        idle: "text-muted-foreground/50",
        dictation: "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400",
        action: "bg-blue-500/8 text-blue-600 dark:text-blue-400",
      },
    },
  }
);

const dotVariants = cva("size-1.5 rounded-full", {
  variants: {
    active: {
      true: "animate-pulse",
      false: "",
    },
    mode: {
      idle: "bg-muted-foreground/40",
      dictation: "bg-emerald-500",
      action: "bg-blue-500",
    },
  },
});

export function VoiceIndicator() {
  const mode = useVoiceStore((s) => s.mode);
  const isConnected = useVoiceStore((s) => s.isConnected);

  if (mode === "idle") {
    return null;
  }

  return (
    <div className={badgeVariants({ mode })}>
      <div className={dotVariants({ active: isConnected, mode })} />
      {mode === "dictation" ? "Dict" : "Agent"}
    </div>
  );
}
