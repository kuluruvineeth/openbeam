"use client";

import type {
  TimelineData,
  TimelineStep,
} from "@openbeam/types/canvas/timeline";
import { useCallback, useEffect, useRef } from "react";
import {
  useExecutionReplayState,
  useExecutionStore,
} from "../stores/execution-store";

interface UseExecutionReplayOptions {
  timeline: TimelineData;
  onStepChange?: (step: TimelineStep | null, index: number) => void;
  autoStart?: boolean;
}

interface UseExecutionReplayReturn {
  isReplaying: boolean;
  isPaused: boolean;
  currentStepIndex: number;
  currentStep: TimelineStep | null;
  playbackSpeed: number;
  totalSteps: number;
  progress: number;
  canGoBack: boolean;
  canGoForward: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  stepForward: () => void;
  stepBack: () => void;
  goToStep: (index: number) => void;
  setPlaybackSpeed: (speed: number) => void;
}

export function useExecutionReplay({
  timeline,
  onStepChange,
  autoStart = false,
}: UseExecutionReplayOptions): UseExecutionReplayReturn {
  const { isReplaying, currentStepIndex, playbackSpeed, isPaused } =
    useExecutionReplayState();
  const startReplay = useExecutionStore((s) => s.startReplay);
  const stopReplay = useExecutionStore((s) => s.stopReplay);
  const pauseReplay = useExecutionStore((s) => s.pauseReplay);
  const resumeReplay = useExecutionStore((s) => s.resumeReplay);
  const setReplayStep = useExecutionStore((s) => s.setReplayStep);
  const setPlaybackSpeedAction = useExecutionStore((s) => s.setPlaybackSpeed);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  const steps = timeline.steps;
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] ?? null;
  const progress =
    totalSteps > 0 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0;

  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < totalSteps - 1;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const notifyStepChange = useCallback(
    (step: TimelineStep | null, index: number) => {
      onStepChangeRef.current?.(step, index);
    },
    []
  );

  const play = useCallback(() => {
    if (!isReplaying) {
      startReplay();
    } else if (isPaused) {
      resumeReplay();
    }
  }, [isReplaying, isPaused, startReplay, resumeReplay]);

  const pause = useCallback(() => {
    pauseReplay();
    clearTimer();
  }, [pauseReplay, clearTimer]);

  const stop = useCallback(() => {
    stopReplay();
    clearTimer();
  }, [stopReplay, clearTimer]);

  const stepForward = useCallback(() => {
    if (canGoForward) {
      const nextIndex = currentStepIndex + 1;
      setReplayStep(nextIndex);
      notifyStepChange(steps[nextIndex] ?? null, nextIndex);
    }
  }, [canGoForward, currentStepIndex, setReplayStep, steps, notifyStepChange]);

  const stepBack = useCallback(() => {
    if (canGoBack) {
      const prevIndex = currentStepIndex - 1;
      setReplayStep(prevIndex);
      notifyStepChange(steps[prevIndex] ?? null, prevIndex);
    }
  }, [canGoBack, currentStepIndex, setReplayStep, steps, notifyStepChange]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setReplayStep(index);
        notifyStepChange(steps[index] ?? null, index);
      }
    },
    [totalSteps, setReplayStep, steps, notifyStepChange]
  );

  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      setPlaybackSpeedAction(speed);
    },
    [setPlaybackSpeedAction]
  );

  useEffect(() => {
    if (isReplaying && !isPaused && canGoForward) {
      const stepDuration = currentStep?.durationMs ?? 1000;
      const adjustedDuration = stepDuration / playbackSpeed;
      const minDuration = 200;
      const maxDuration = 3000;
      const clampedDuration = Math.max(
        minDuration,
        Math.min(maxDuration, adjustedDuration)
      );

      timerRef.current = setTimeout(() => {
        stepForward();
      }, clampedDuration);
    } else if (isReplaying && !canGoForward) {
      stopReplay();
    }

    return clearTimer;
  }, [
    isReplaying,
    isPaused,
    canGoForward,
    currentStep,
    playbackSpeed,
    stepForward,
    stopReplay,
    clearTimer,
  ]);

  useEffect(() => {
    if (autoStart && totalSteps > 0 && !isReplaying) {
      play();
    }
  }, [autoStart, totalSteps, isReplaying, play]);

  useEffect(
    () => () => {
      clearTimer();
    },
    [clearTimer]
  );

  return {
    isReplaying,
    isPaused,
    currentStepIndex,
    currentStep,
    playbackSpeed,
    totalSteps,
    progress,
    canGoBack,
    canGoForward,
    play,
    pause,
    stop,
    stepForward,
    stepBack,
    goToStep,
    setPlaybackSpeed,
  };
}

export type { UseExecutionReplayOptions, UseExecutionReplayReturn };
