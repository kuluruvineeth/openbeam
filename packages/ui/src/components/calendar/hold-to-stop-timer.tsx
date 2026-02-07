"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "../../utils/cn";
import { Icons } from "../icons";

interface TimerProps {
  isRunning: boolean;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  holdDuration?: number;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { button: "h-12 w-12", icon: "h-5 w-5", text: "text-lg" },
  md: { button: "h-16 w-16", icon: "h-6 w-6", text: "text-2xl" },
  lg: { button: "h-20 w-20", icon: "h-8 w-8", text: "text-3xl" },
};

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function HoldToStopTimer({
  isRunning,
  elapsed,
  onStart,
  onStop,
  holdDuration = 1500,
  size = "md",
}: TimerProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdStartRef = useRef<number>(0);
  const animationRef = useRef<number>(0);

  const sizeStyles = sizes[size];

  const updateHoldProgress = useCallback(() => {
    const elapsedHold = Date.now() - holdStartRef.current;
    const progress = Math.min(elapsedHold / holdDuration, 1);
    setHoldProgress(progress);

    if (progress >= 1) {
      onStop();
      setIsHolding(false);
      setHoldProgress(0);
    } else {
      animationRef.current = requestAnimationFrame(updateHoldProgress);
    }
  }, [holdDuration, onStop]);

  const handlePointerDown = () => {
    if (!isRunning) {
      onStart();
      return;
    }

    setIsHolding(true);
    holdStartRef.current = Date.now();
    animationRef.current = requestAnimationFrame(updateHoldProgress);
  };

  const handlePointerUp = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(
    () => () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    },
    []
  );

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - holdProgress);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn("font-mono tabular-nums", sizeStyles.text)}>
        {formatTime(elapsed)}
      </div>

      <div className="relative">
        <button
          className={cn(
            "relative flex items-center justify-center rounded-full",
            "transition-all duration-200",
            sizeStyles.button,
            isRunning
              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerUp}
          onPointerUp={handlePointerUp}
          type="button"
        >
          {isRunning ? (
            <Icons.Square className={sizeStyles.icon} />
          ) : (
            <Icons.Play className={cn(sizeStyles.icon, "ml-0.5")} />
          )}
        </button>

        <AnimatePresence>
          {isHolding && (
            <motion.svg
              animate={{ opacity: 1 }}
              aria-hidden="true"
              className="-rotate-90 pointer-events-none absolute inset-0"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              viewBox="0 0 56 56"
            >
              <circle
                className="text-red-500 transition-all duration-75"
                cx="28"
                cy="28"
                fill="none"
                r={radius}
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeWidth="3"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      <p className="text-muted-foreground text-xs">
        {isRunning ? "Hold to stop" : "Click to start"}
      </p>
    </div>
  );
}

export { HoldToStopTimer };
export type { TimerProps };
