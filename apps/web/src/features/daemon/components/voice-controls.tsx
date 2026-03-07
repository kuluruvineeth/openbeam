"use client";

import { cn, Icons } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import { cva } from "class-variance-authority";
import { useCallback } from "react";
import { useSessionStore } from "../stores/session-store";

type VoiceState = "idle" | "recording" | "processing" | "playing";

const voiceButtonVariants = cva(
  "relative flex items-center justify-center rounded-md transition-colors",
  {
    variants: {
      state: {
        idle: "bg-muted text-muted-foreground hover:bg-accent",
        recording: "bg-destructive text-destructive-foreground",
        processing: "bg-primary text-primary-foreground",
        playing: "bg-accent text-accent-foreground",
      },
      size: {
        sm: "size-8",
        md: "size-10",
        lg: "size-14",
      },
    },
    defaultVariants: {
      state: "idle",
      size: "md",
    },
  }
);

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Speak",
  recording: "Listening...",
  processing: "Processing...",
  playing: "Speaking...",
};

function VoiceStateIcon({ state }: { state: VoiceState }) {
  switch (state) {
    case "idle":
      return <Icons.Mic className="size-4" />;
    case "recording":
      return <Icons.Pause className="size-4" />;
    case "processing":
      return <Icons.Loader2 className="size-4 animate-spin" />;
    case "playing":
      return <Icons.Volume2 className="size-4" />;
    default:
      return <Icons.Mic className="size-4" />;
  }
}

function VolumeMeter({ level }: { level: number }) {
  const bars = 5;
  const activeCount = Math.round(level * bars);

  return (
    <div className="flex items-end gap-0.5">
      {Array.from({ length: bars }, (_, i) => (
        <div
          className={cn(
            "w-1 rounded-sm transition-all duration-75",
            i < activeCount ? "bg-destructive" : "bg-border/50"
          )}
          key={i}
          style={{ height: 4 + i * 3 }}
        />
      ))}
    </div>
  );
}

interface VoiceControlsProps {
  serverId: string;
  agentId: string;
  voiceState?: VoiceState;
  volumeLevel?: number;
  onToggleRecording?: () => void;
  onStopPlayback?: () => void;
  onMuteToggle?: () => void;
  isMuted?: boolean;
  compact?: boolean;
}

export function VoiceControls({
  serverId,
  voiceState = "idle",
  volumeLevel = 0,
  onToggleRecording,
  onStopPlayback,
  onMuteToggle,
  isMuted = false,
  compact = false,
}: VoiceControlsProps) {
  const isPlayingAudio = useSessionStore(
    (state) => state.sessions[serverId]?.isPlayingAudio ?? false
  );

  const currentState: VoiceState = isPlayingAudio ? "playing" : voiceState;
  const isActive = currentState !== "idle";

  const handleMainAction = useCallback(() => {
    if (currentState === "playing") {
      onStopPlayback?.();
      return;
    }
    onToggleRecording?.();
  }, [currentState, onToggleRecording, onStopPlayback]);

  const label = STATE_LABELS[currentState];

  if (compact) {
    return (
      <Button
        className={cn(
          "size-8",
          currentState === "recording" && "text-destructive",
          currentState === "processing" && "text-primary"
        )}
        disabled={currentState === "processing"}
        onClick={handleMainAction}
        size="icon"
        variant="ghost"
      >
        <VoiceStateIcon state={currentState} />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className={voiceButtonVariants({ state: currentState, size: "md" })}
        disabled={currentState === "processing"}
        onClick={handleMainAction}
        type="button"
      >
        {currentState === "recording" && (
          <span className="absolute inset-0 animate-ping rounded-md bg-destructive/20" />
        )}
        <VoiceStateIcon state={currentState} />
      </button>

      {isActive && (
        <div className="flex items-center gap-2">
          {currentState === "recording" && <VolumeMeter level={volumeLevel} />}
          <span className="text-muted-foreground text-xs">{label}</span>
        </div>
      )}

      {isActive && onMuteToggle && (
        <Button
          className="size-7"
          onClick={onMuteToggle}
          size="icon"
          variant="ghost"
        >
          {isMuted ? (
            <Icons.VolumeX className="size-3.5 text-muted-foreground" />
          ) : (
            <Icons.Volume2 className="size-3.5" />
          )}
        </Button>
      )}

      {currentState === "playing" && onStopPlayback && (
        <Button
          className="size-7"
          onClick={onStopPlayback}
          size="icon"
          variant="ghost"
        >
          <Icons.Square className="size-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
