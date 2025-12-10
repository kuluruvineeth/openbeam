"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsFloat, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useRef, useState } from "react";
import type { VideoPlaybackState } from "@/lib/video-types";
import { useTRPC } from "@/trpc/client";

const VIDEO_TABS = [
  "chapters",
  "highlights",
  "transcript",
  "ask",
  "info",
] as const;

type ContentType = "chapters" | "highlights" | "summary" | "transcript";

export function useVideoUrlState() {
  return useQueryStates({
    panel: parseAsStringLiteral(VIDEO_TABS).withDefault("chapters"),
    t: parseAsFloat.withDefault(0),
  });
}

const INITIAL_STATE: VideoPlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isFullscreen: false,
  isMuted: false,
};

export function useVideoPlayback() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<VideoPlaybackState>(INITIAL_STATE);

  const play = useCallback(() => {
    videoRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.volume = Math.max(0, Math.min(1, volume));
    video.muted = volume === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = !video.muted;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.playbackRate = rate;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.parentElement?.requestFullscreen();
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setState((prev) => ({ ...prev, currentTime: video.currentTime }));
  }, []);

  const handleDurationChange = useCallback(() => {
    const video = videoRef.current;
    if (!(video && Number.isFinite(video.duration))) {
      return;
    }
    setState((prev) => ({ ...prev, duration: video.duration }));
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!(video && Number.isFinite(video.duration))) {
      return;
    }
    setState((prev) => ({ ...prev, duration: video.duration }));
  }, []);

  const handlePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const handlePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setState((prev) => ({
      ...prev,
      volume: video.volume,
      isMuted: video.muted,
    }));
  }, []);

  const handleRateChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setState((prev) => ({ ...prev, playbackRate: video.playbackRate }));
  }, []);

  const handleFullscreenChange = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isFullscreen: !!document.fullscreenElement,
    }));
  }, []);

  return {
    videoRef,
    state,
    actions: {
      play,
      pause,
      togglePlay,
      seek,
      setVolume,
      toggleMute,
      setPlaybackRate,
      toggleFullscreen,
    },
    handlers: {
      onTimeUpdate: handleTimeUpdate,
      onDurationChange: handleDurationChange,
      onLoadedMetadata: handleLoadedMetadata,
      onPlay: handlePlay,
      onPause: handlePause,
      onVolumeChange: handleVolumeChange,
      onRateChange: handleRateChange,
      onFullscreenChange: handleFullscreenChange,
    },
  };
}

export function useVideoControls(hideDelay = 3000) {
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback(() => {
    setVisible(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setVisible(false), hideDelay);
  }, [hideDelay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  }, []);

  return { visible, show, hide };
}

type VideoAIParams = {
  vespaId: string;
  enabled?: boolean;
};

export function useVideoChapters({ vespaId, enabled = true }: VideoAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.video.getChapters.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.chapters,
  });
}

export function useVideoHighlights({ vespaId, enabled = true }: VideoAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.video.getHighlights.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.highlights,
  });
}

export function useVideoTranscript({ vespaId, enabled = true }: VideoAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.video.getTranscript.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.segments,
  });
}

export function useVideoSummary({ vespaId, enabled = true }: VideoAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.video.getSummary.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.summary,
  });
}

export function useVideoMetadata({ vespaId, enabled = true }: VideoAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.video.getMetadata.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useVideoRegenerate(vespaId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    ...trpc.video.regenerate.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [["video"], { input: { vespaId } }],
      });
    },
  });

  const regenerate = useCallback(
    (contentTypes: ContentType[]) =>
      mutation.mutateAsync({ vespaId, contentTypes }),
    [mutation, vespaId]
  );

  return {
    regenerate,
    isRegenerating: mutation.isPending,
    error: mutation.error,
  };
}

export function useVideoAsk() {
  const trpc = useTRPC();

  return useMutation(trpc.video.ask.mutationOptions());
}
