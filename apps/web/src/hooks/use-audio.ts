"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsFloat, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useRef, useState } from "react";
import type { AudioPlaybackState } from "@/lib/audio-types";
import { useTRPC } from "@/trpc/client";

const AUDIO_TABS = ["transcript", "summary", "ask"] as const;

export function useAudioUrlState() {
  return useQueryStates({
    panel: parseAsStringLiteral(AUDIO_TABS).withDefault("transcript"),
    t: parseAsFloat.withDefault(0),
  });
}

const INITIAL_STATE: AudioPlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isMuted: false,
};

export function useAudioPlayback() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioPlaybackState>(INITIAL_STATE);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.muted = volume === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.muted = !audio.muted;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.playbackRate = rate;
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
  }, []);

  const handleDurationChange = useCallback(() => {
    const audio = audioRef.current;
    if (!(audio && Number.isFinite(audio.duration))) {
      return;
    }
    setState((prev) => ({ ...prev, duration: audio.duration }));
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!(audio && Number.isFinite(audio.duration))) {
      return;
    }
    setState((prev) => ({ ...prev, duration: audio.duration }));
  }, []);

  const handlePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const handlePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const handleVolumeChange = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    setState((prev) => ({
      ...prev,
      volume: audio.volume,
      isMuted: audio.muted,
    }));
  }, []);

  const handleRateChange = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    setState((prev) => ({ ...prev, playbackRate: audio.playbackRate }));
  }, []);

  return {
    audioRef,
    state,
    actions: {
      togglePlay,
      seek,
      setVolume,
      toggleMute,
      setPlaybackRate,
    },
    handlers: {
      onTimeUpdate: handleTimeUpdate,
      onDurationChange: handleDurationChange,
      onLoadedMetadata: handleLoadedMetadata,
      onPlay: handlePlay,
      onPause: handlePause,
      onVolumeChange: handleVolumeChange,
      onRateChange: handleRateChange,
    },
  };
}

type AudioAIParams = {
  vespaId: string;
  enabled?: boolean;
};

export function useAudioTranscript({ vespaId, enabled = true }: AudioAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.media.getTranscript.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.segments,
  });
}

export function useAudioSummary({ vespaId, enabled = true }: AudioAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.media.getSummary.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.summary,
  });
}

export function useAudioAsk() {
  const trpc = useTRPC();
  return useMutation(trpc.media.ask.mutationOptions());
}
