"use client";

import { type RefObject, useCallback, useRef, useState } from "react";
import { AudioVisualizer } from "@/components/file-preview/viewers/audio/audio-visualizer";
import { useAudioAnalyser } from "@/components/file-preview/viewers/audio/use-audio-analyser";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type AudioWaveformProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  isPlaying?: boolean;
  onSeek: (time: number) => void;
};

export function AudioWaveform({
  audioRef,
  currentTime,
  duration,
  isPlaying = false,
  onSeek,
}: AudioWaveformProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const { frequencyData, isActive } = useAudioAnalyser(audioRef);

  const progress = duration > 0 ? currentTime / duration : 0;
  const hoverProgress = hoverPosition !== null ? hoverPosition : progress;

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current || duration <= 0) {
        return;
      }
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );
      onSeek(percent * duration);
    },
    [duration, onSeek]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) {
      return;
    }
    const rect = trackRef.current.getBoundingClientRect();
    setHoverPosition(
      Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (duration <= 0) {
        return;
      }
      const step = duration * 0.02;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSeek(Math.max(0, currentTime - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + step));
      }
    },
    [currentTime, duration, onSeek]
  );

  return (
    <div className="w-full">
      <AudioVisualizer frequencyData={frequencyData} isActive={isActive} />

      <div
        aria-label="Audio progress"
        aria-valuemax={duration}
        aria-valuemin={0}
        aria-valuenow={currentTime}
        className="group relative mt-4 h-10 w-full cursor-pointer"
        onClick={handleSeek}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHoverPosition(null)}
        onMouseMove={handleMouseMove}
        ref={trackRef}
        role="slider"
        tabIndex={0}
      >
        <div className="-translate-y-1/2 absolute inset-x-0 top-1/2 h-0.5 bg-foreground/10" />

        <div
          className={cn(
            "-translate-y-1/2 absolute top-1/2 left-0 h-0.5 bg-foreground/60 transition-[width] duration-75",
            isPlaying && "bg-foreground"
          )}
          style={{ width: `${progress * 100}%` }}
        />

        <div
          className={cn(
            "-translate-x-1/2 -translate-y-1/2 absolute top-1/2 transition-transform duration-75",
            "size-2.5 bg-foreground/60",
            isPlaying && "bg-foreground"
          )}
          style={{ left: `${progress * 100}%` }}
        />

        {hoverPosition !== null && hoverPosition !== progress && (
          <>
            <div
              className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 size-1.5 bg-foreground/30"
              style={{ left: `${hoverPosition * 100}%` }}
            />
            <div
              className="-top-5 -translate-x-1/2 pointer-events-none absolute"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              <span className="bg-foreground/90 px-1.5 py-0.5 font-mono text-[10px] text-background tabular-nums">
                {formatTime(hoverProgress * duration)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
