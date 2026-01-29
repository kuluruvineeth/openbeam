"use client";

import { forwardRef, type RefObject, useEffect } from "react";
import type { MediaChapter, MediaPlaybackState } from "@/lib/media-types";
import { cn } from "@/lib/utils";

type VideoPlayerProps = {
  url: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  state: MediaPlaybackState;
  chapters?: MediaChapter[];
  onTimeUpdate: () => void;
  onDurationChange: () => void;
  onLoadedMetadata: () => void;
  onPlay: () => void;
  onPause: () => void;
  onVolumeChange: () => void;
  onRateChange: () => void;
  onMouseMove: () => void;
  onClick: () => void;
};

export const VideoPlayer = forwardRef<HTMLDivElement, VideoPlayerProps>(
  (
    {
      url,
      videoRef,
      state,
      chapters,
      onTimeUpdate,
      onDurationChange,
      onLoadedMetadata,
      onPlay,
      onPause,
      onVolumeChange,
      onRateChange,
      onMouseMove,
      onClick,
    },
    ref
  ) => {
    useEffect(() => {
      const handleFullscreen = () => {
        document.dispatchEvent(new Event("fullscreenchange"));
      };
      document.addEventListener("fullscreenchange", handleFullscreen);
      return () =>
        document.removeEventListener("fullscreenchange", handleFullscreen);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onClick();
      }
    };

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/noNoninteractiveElementInteractions: Mouse move is for UI state (show/hide controls)
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center bg-black",
          state.isFullscreen && "fixed inset-0 z-50"
        )}
        onMouseMove={onMouseMove}
        ref={ref}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: Captions provided by transcript panel */}
        <video
          autoPlay
          className="max-h-full max-w-full cursor-pointer focus:outline-none"
          onClick={onClick}
          onDurationChange={onDurationChange}
          onKeyDown={handleKeyDown}
          onLoadedMetadata={onLoadedMetadata}
          onPause={onPause}
          onPlay={onPlay}
          onRateChange={onRateChange}
          onTimeUpdate={onTimeUpdate}
          onVolumeChange={onVolumeChange}
          preload="auto"
          ref={videoRef}
          src={url}
          tabIndex={0}
        />

        {chapters && state.duration > 0 && (
          <ChapterMarkers chapters={chapters} duration={state.duration} />
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

function ChapterMarkers({
  chapters,
  duration,
}: {
  chapters: MediaChapter[];
  duration: number;
}) {
  return (
    <div className="pointer-events-none absolute right-0 bottom-14 left-0 px-3">
      <div className="relative h-1.5">
        {chapters.map((chapter, index) => (
          <div
            className="absolute h-full w-0.5 bg-white/70"
            key={`${index}-${chapter.startSec}`}
            style={{ left: `${(chapter.startSec / duration) * 100}%` }}
            title={chapter.title}
          />
        ))}
      </div>
    </div>
  );
}
