"use client";

import { Button } from "@openplane/ui";
import { Icons } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AudioPlaybackState } from "@/lib/audio-types";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type AudioToolbarProps = {
  state: AudioPlaybackState;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSetPlaybackRate: (rate: number) => void;
};

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioToolbar({
  state,
  onTogglePlay,
  onToggleMute,
  onSetPlaybackRate,
}: AudioToolbarProps) {
  const { isPlaying, currentTime, duration, isMuted, playbackRate } = state;

  return (
    <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
      <ControlButton
        icon={isPlaying ? <Icons.Pause size={20} /> : <Icons.Play size={20} />}
        onClick={onTogglePlay}
        size="lg"
        tooltip={isPlaying ? "Pause (Space)" : "Play (Space)"}
      />

      <span className="font-mono text-[13px] text-foreground/70 tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <ControlButton
        icon={
          isMuted ? (
            <Icons.VolumeMute size={16} />
          ) : (
            <Icons.VolumeHigh size={16} />
          )
        }
        onClick={onToggleMute}
        tooltip={isMuted ? "Unmute" : "Mute"}
      />

      <PlaybackRateSelector
        currentRate={playbackRate}
        onSelect={onSetPlaybackRate}
      />
    </div>
  );
}

function ControlButton({
  icon,
  tooltip,
  onClick,
  size = "sm",
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  size?: "sm" | "lg";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "text-foreground/60 hover:bg-foreground/4 hover:text-foreground",
            size === "lg" && "size-10",
            size === "sm" && "size-8"
          )}
          onClick={onClick}
          size="icon"
          variant="ghost"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function PlaybackRateSelector({
  currentRate,
  onSelect,
}: {
  currentRate: number;
  onSelect: (rate: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 px-2 font-mono text-[11px] text-foreground/60 hover:bg-foreground/4 hover:text-foreground"
          variant="ghost"
        >
          {currentRate}x
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-16">
        {PLAYBACK_RATES.map((rate) => (
          <DropdownMenuItem
            className={cn(
              "justify-center font-mono text-[11px]",
              rate === currentRate && "bg-accent"
            )}
            key={rate}
            onClick={() => onSelect(rate)}
          >
            {rate}x
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
