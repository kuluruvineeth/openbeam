"use client";

import type { RefObject } from "react";
import type { AudioPlaybackState } from "@/lib/audio-types";
import { AudioToolbar } from "./audio-toolbar";
import { AudioWaveform } from "./audio-waveform";

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

export function AudioPlayer({
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
}: AudioPlayerProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-muted/30">
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
      >
        <track kind="captions" />
      </audio>

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
