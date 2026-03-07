"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { formatTime } from "@/lib/format";
import type { MediaPlaybackState } from "@/lib/media-types";
import { cn } from "@/lib/utils";

type VideoToolbarProps = {
  state: MediaPlaybackState;
  visible: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSeek: (time: number) => void;
  onSetPlaybackRate: (rate: number) => void;
};

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoToolbar({
  state,
  visible,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
  onSeek,
  onSetPlaybackRate,
}: VideoToolbarProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    isMuted,
    playbackRate,
    isFullscreen,
  } = state;

  return (
    <div
      className={cn(
        "absolute right-0 bottom-0 left-0 z-20 bg-linear-to-t from-black/80 to-transparent px-3 pt-8 pb-3 transition-opacity duration-300",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
      />

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <ControlButton
            icon={
              isPlaying ? <Icons.Pause size={18} /> : <Icons.Play size={18} />
            }
            onClick={onTogglePlay}
            tooltip={isPlaying ? "Pause (Space)" : "Play (Space)"}
          />

          <ControlButton
            icon={
              isMuted ? (
                <Icons.VolumeMute size={18} />
              ) : (
                <Icons.VolumeHigh size={18} />
              )
            }
            onClick={onToggleMute}
            tooltip={isMuted ? "Unmute" : "Mute"}
          />

          <span className="ml-2 font-mono text-[11px] text-white/90 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <PlaybackRateSelector
            currentRate={playbackRate}
            onSelect={onSetPlaybackRate}
          />

          <ControlButton
            icon={
              isFullscreen ? (
                <Icons.ExitFullscreen size={18} />
              ) : (
                <Icons.Fullscreen size={18} />
              )
            }
            onClick={onToggleFullscreen}
            tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  };

  return (
    <button
      aria-label={`Video progress: ${formatTime(currentTime)} of ${formatTime(duration)}`}
      className="group relative h-1.5 w-full cursor-pointer bg-white/20 transition-all hover:h-2"
      onClick={handleClick}
      type="button"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 bg-primary"
        style={{ width: `${progress}%` }}
      />
      <div
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 size-3 bg-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        style={{ left: `calc(${progress}% - 6px)` }}
      />
    </button>
  );
}

function ControlButton({
  icon,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="size-8 text-white/80 hover:bg-white/10 hover:text-white"
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
          className="h-8 px-2 font-mono text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
          variant="ghost"
        >
          {currentRate}x
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-16">
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
