"use client";

import { cn } from "@openbeam/ui";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

const micButtonVariants = cva(
  "flex items-center justify-center transition-colors duration-150",
  {
    variants: {
      state: {
        idle: "text-muted-foreground/50 hover:text-foreground",
        listening: "text-primary",
        error: "text-destructive/60",
      },
    },
    defaultVariants: { state: "idle" },
  }
);

type VoiceSearchButtonProps = {
  onTranscript: (text: string) => void;
  className?: string;
};

export function VoiceSearchButton({
  onTranscript,
  className,
}: VoiceSearchButtonProps) {
  const {
    isListening,
    interimTranscript,
    isSupported,
    error,
    start,
    stop,
    reset,
  } = useSpeechRecognition({
    continuous: false,
    onTranscript,
  });

  const commitTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!isListening && interimTranscript) {
      commitTimerRef.current = setTimeout(() => {
        reset();
      }, 500);
    }
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
    };
  }, [isListening, interimTranscript, reset]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      reset();
      start();
    }
  }, [isListening, start, stop, reset]);

  useHotkeys("mod+shift+v", (e) => {
    e.preventDefault();
    toggle();
  });

  if (!isSupported) {
    return null;
  }

  function resolveState() {
    if (error) {
      return "error" as const;
    }
    if (isListening) {
      return "listening" as const;
    }
    return "idle" as const;
  }
  const state = resolveState();

  return (
    <button
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      className={cn(
        micButtonVariants({ state }),
        "relative shrink-0",
        className
      )}
      onClick={toggle}
      type="button"
    >
      <AnimatePresence mode="wait">
        {isListening ? (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="wave"
            transition={{ duration: 0.15 }}
          >
            <Icons.AudioWave size={18} />
          </motion.span>
        ) : (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="mic"
            transition={{ duration: 0.15 }}
          >
            {error ? <Icons.MicOff size={18} /> : <Icons.Mic size={18} />}
          </motion.span>
        )}
      </AnimatePresence>

      {isListening && (
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
      )}
    </button>
  );
}
