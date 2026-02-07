"use client";

import type { TimelineData } from "@openplane/types/canvas/timeline";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, memo, useCallback } from "react";
import {
  type UseExecutionReplayReturn,
  useExecutionReplay,
} from "../../hooks/use-execution-replay";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { Slider } from "../slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

const replayControllerVariants = cva(
  "flex items-center gap-2 rounded-md border bg-background p-2",
  {
    variants: {
      size: {
        sm: "gap-1 p-1",
        default: "gap-2 p-2",
        lg: "gap-3 p-3",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const PLAYBACK_SPEEDS = [
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "4x", value: 4 },
] as const;

type ReplayControllerProps = React.ComponentProps<"div"> &
  VariantProps<typeof replayControllerVariants> & {
    timeline: TimelineData;
    showProgress?: boolean;
    showSpeedControl?: boolean;
    showStepCounter?: boolean;
    onStepChange?: (index: number) => void;
  };

const ReplayController = forwardRef<HTMLDivElement, ReplayControllerProps>(
  (
    {
      timeline,
      size,
      showProgress = true,
      showSpeedControl = true,
      showStepCounter = true,
      onStepChange,
      className,
      ...props
    },
    ref
  ) => {
    const replay = useExecutionReplay({
      timeline,
      onStepChange: (_step, index) => onStepChange?.(index),
    });

    return (
      <div
        className={cn(replayControllerVariants({ size }), className)}
        ref={ref}
        {...props}
      >
        <ReplayControls replay={replay} size={size} />

        {showProgress && <ReplayProgress replay={replay} size={size} />}

        {showStepCounter && (
          <ReplayStepCounter
            currentStep={replay.currentStepIndex + 1}
            size={size}
            totalSteps={replay.totalSteps}
          />
        )}

        {showSpeedControl && (
          <ReplaySpeedControl
            onSpeedChange={replay.setPlaybackSpeed}
            playbackSpeed={replay.playbackSpeed}
            size={size}
          />
        )}
      </div>
    );
  }
);
ReplayController.displayName = "ReplayController";

interface ReplayControlsProps {
  replay: UseExecutionReplayReturn;
  size?: "sm" | "default" | "lg" | null;
}

const ICON_SIZE_MAP = {
  sm: "size-3",
  default: "size-4",
  lg: "size-5",
} as const;

const ReplayControls = memo(function ReplayControlsComponent({
  replay,
  size,
}: ReplayControlsProps) {
  const buttonSize = size === "lg" ? "icon" : "sm";
  const iconSize = ICON_SIZE_MAP[size ?? "default"];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={!replay.canGoBack}
              onClick={replay.stepBack}
              size={buttonSize}
              variant="ghost"
            >
              <Icons.ChevronLeft className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Previous step</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            {replay.isReplaying && !replay.isPaused ? (
              <Button onClick={replay.pause} size={buttonSize} variant="ghost">
                <Icons.Pause className={iconSize} />
              </Button>
            ) : (
              <Button
                disabled={replay.totalSteps === 0}
                onClick={replay.play}
                size={buttonSize}
                variant="ghost"
              >
                <Icons.Play className={iconSize} />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent side="top">
            {replay.isReplaying && !replay.isPaused ? "Pause" : "Play"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={!replay.isReplaying}
              onClick={replay.stop}
              size={buttonSize}
              variant="ghost"
            >
              <Icons.Square className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Stop</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={!replay.canGoForward}
              onClick={replay.stepForward}
              size={buttonSize}
              variant="ghost"
            >
              <Icons.ChevronRight className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Next step</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
});

interface ReplayProgressProps {
  replay: UseExecutionReplayReturn;
  size?: "sm" | "default" | "lg" | null;
}

const ReplayProgress = memo(function ReplayProgressComponent({
  replay,
  size,
}: ReplayProgressProps) {
  const handleSliderChange = useCallback(
    (value: number[]) => {
      const val = value[0];
      if (val === undefined) {
        return;
      }
      const index = Math.round((val / 100) * (replay.totalSteps - 1));
      replay.goToStep(index);
    },
    [replay]
  );

  const SLIDER_WIDTH_MAP = {
    sm: "w-24",
    default: "w-32",
    lg: "w-48",
  } as const;
  const sliderClass = SLIDER_WIDTH_MAP[size ?? "default"];

  return (
    <div className={cn("flex-1", sliderClass)}>
      <Slider
        disabled={replay.totalSteps === 0}
        max={100}
        onValueChange={handleSliderChange}
        step={1}
        value={[replay.progress]}
      />
    </div>
  );
});

interface ReplayStepCounterProps {
  currentStep: number;
  totalSteps: number;
  size?: "sm" | "default" | "lg" | null;
}

const TEXT_SIZE_MAP = {
  sm: "text-xs",
  default: "text-xs",
  lg: "text-sm",
} as const;

const ReplayStepCounter = memo(function ReplayStepCounterComponent({
  currentStep,
  totalSteps,
  size,
}: ReplayStepCounterProps) {
  const textClass = TEXT_SIZE_MAP[size ?? "default"];

  return (
    <div className={cn("text-muted-foreground tabular-nums", textClass)}>
      {currentStep}/{totalSteps}
    </div>
  );
});

interface ReplaySpeedControlProps {
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  size?: "sm" | "default" | "lg" | null;
}

const SELECT_SIZE_MAP = {
  sm: "h-7 w-14",
  default: "h-8 w-16",
  lg: "h-10 w-20",
} as const;

const ReplaySpeedControl = memo(function ReplaySpeedControlComponent({
  playbackSpeed,
  onSpeedChange,
  size,
}: ReplaySpeedControlProps) {
  const handleValueChange = useCallback(
    (value: string) => {
      onSpeedChange(Number.parseFloat(value));
    },
    [onSpeedChange]
  );

  const selectClass = SELECT_SIZE_MAP[size ?? "default"];

  return (
    <Select onValueChange={handleValueChange} value={String(playbackSpeed)}>
      <SelectTrigger className={selectClass}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PLAYBACK_SPEEDS.map((speed) => (
          <SelectItem key={speed.value} value={String(speed.value)}>
            {speed.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

export { ReplayController, replayControllerVariants };
export type { ReplayControllerProps };
