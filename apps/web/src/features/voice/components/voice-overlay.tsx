"use client";

import { cva } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import { STATE_LABELS } from "../constants";
import { useVoiceStore } from "../stores/voice-store";
import type { AgentState } from "../types";
import { VoiceVisualizer } from "./voice-visualizer";

const SPRING_ENTER = { type: "spring" as const, stiffness: 420, damping: 30 };

const accentVariants = cva(
  "overflow-hidden rounded-md border border-border/50 border-t-2 bg-background/90 shadow-sm backdrop-blur-md",
  {
    variants: {
      mode: {
        dictation: "border-t-emerald-500/50",
        action: "border-t-blue-500/50",
      },
    },
  }
);

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    mode: {
      dictation: "bg-emerald-500",
      action: "bg-blue-500",
    },
  },
});

const modeLabelVariants = cva(
  "shrink-0 font-medium text-[11px] uppercase tracking-wider",
  {
    variants: {
      mode: {
        dictation: "text-emerald-600 dark:text-emerald-400",
        action: "text-blue-600 dark:text-blue-400",
      },
    },
  }
);

const stateVariants = cva("size-1 shrink-0 rounded-full", {
  variants: {
    state: {
      disconnected: "bg-muted-foreground/40",
      connecting: "animate-pulse bg-amber-500",
      initializing: "animate-pulse bg-amber-500",
      listening: "bg-emerald-500",
      thinking: "animate-pulse bg-blue-500",
      speaking: "bg-violet-500",
    } satisfies Record<AgentState, string>,
  },
});

export function VoiceOverlay() {
  const mode = useVoiceStore((s) => s.mode);
  const agentState = useVoiceStore((s) => s.agentState);
  const isMuted = useVoiceStore((s) => s.isMuted);
  const transcript = useVoiceStore((s) => s.transcript);
  const interimTranscript = useVoiceStore((s) => s.interimTranscript);

  const isActive = mode !== "idle";
  const hasTranscript = Boolean(transcript || interimTranscript);
  const activeMode = mode as "dictation" | "action";

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          animate={{ opacity: 1, y: 0, transition: SPRING_ENTER }}
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
          exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
          initial={{ opacity: 0, y: 16 }}
        >
          <div
            className={`pointer-events-auto ${accentVariants({ mode: activeMode })}`}
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex shrink-0 items-center gap-1.5">
                <div className={dotVariants({ mode: activeMode })} />
                <span className={modeLabelVariants({ mode: activeMode })}>
                  {activeMode === "dictation" ? "Dict" : "Agent"}
                </span>
              </div>

              <div className="h-4 w-px shrink-0 bg-border/40" />

              <VoiceVisualizer />

              <div className="h-4 w-px shrink-0 bg-border/40" />

              <div className="flex shrink-0 items-center gap-1.5">
                <div className={stateVariants({ state: agentState })} />
                <span className="font-mono text-muted-foreground text-xs">
                  {STATE_LABELS[agentState]}
                </span>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
                {isMuted && (
                  <span className="font-medium text-[10px] text-destructive/70 uppercase tracking-wider">
                    Muted
                  </span>
                )}
                <kbd className="hidden rounded border border-border/40 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/50 sm:inline-flex">
                  esc
                </kbd>
              </div>
            </div>

            <AnimatePresence>
              {hasTranscript && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="border-border/30 border-t px-3 py-2">
                    <p className="max-w-[420px] text-sm leading-relaxed">
                      {transcript}
                      {interimTranscript && (
                        <span className="text-muted-foreground/40">
                          {interimTranscript}
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
