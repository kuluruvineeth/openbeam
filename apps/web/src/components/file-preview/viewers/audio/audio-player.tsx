"use client";

import { forwardRef, type RefObject } from "react";
import { AudioToolbar } from "@/components/file-preview/viewers/audio/audio-toolbar";
import { AudioWaveform } from "@/components/file-preview/viewers/audio/audio-waveform";
import type { AudioPlaybackState } from "@/lib/audio-types";

type AudioPlayerProps = {
  url: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  state: AudioPlaybackState;
  onTimeUpdate: () => void;
  onDurationChange: () => void;
  onLoadedMetadata: () => void;
  onPlay: () => void;
  onPause: () => void;
  onVolumeChange: () => void;
  onRateChange: () => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSetPlaybackRate: (rate: number) => void;
};

export const AudioPlayer = forwardRef<HTMLDivElement, AudioPlayerProps>(
  (
    {
      url,
      audioRef,
      state,
      onTimeUpdate,
      onDurationChange,
      onLoadedMetadata,
      onPlay,
      onPause,
      onVolumeChange,
      onRateChange,
      onSeek,
      onTogglePlay,
      onToggleMute,
      onSetPlaybackRate,
    },
    containerRef
  ) => {
    return (
      <div
        className="relative flex h-full w-full items-center justify-center bg-muted/30"
        ref={containerRef}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: Captions in transcript panel */}
        <audio
          autoPlay
          crossOrigin="anonymous"
          onDurationChange={onDurationChange}
          onLoadedMetadata={onLoadedMetadata}
          onPause={onPause}
          onPlay={onPlay}
          onRateChange={onRateChange}
          onTimeUpdate={onTimeUpdate}
          onVolumeChange={onVolumeChange}
          preload="auto"
          ref={audioRef}
          src={url}
        />

        <div className="w-full max-w-xl px-6">
          <AudioWaveform
            audioRef={audioRef}
            currentTime={state.currentTime}
            duration={state.duration}
            isPlaying={state.isPlaying}
            onSeek={onSeek}
          />
          <AudioToolbar
            onSetPlaybackRate={onSetPlaybackRate}
            onToggleMute={onToggleMute}
            onTogglePlay={onTogglePlay}
            state={state}
          />
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";
