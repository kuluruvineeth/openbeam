"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsFloat, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useRef, useState } from "react";
import type { MediaPlaybackState } from "@/lib/media-types";
import { useTRPC } from "@/trpc/client";

const MEDIA_TABS = [
  "chapters",
  "highlights",
  "transcript",
  "ask",
  "info",
] as const;

type ContentType = "chapters" | "highlights" | "summary" | "transcript";

export function useMediaUrlState() {
  return useQueryStates({
    panel: parseAsStringLiteral(MEDIA_TABS).withDefault("chapters"),
    t: parseAsFloat.withDefault(0),
  });
}

const INITIAL_STATE: MediaPlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isFullscreen: false,
  isMuted: false,
};

export function useMediaPlayback() {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<MediaPlaybackState>(INITIAL_STATE);

  const play = useCallback(() => {
    mediaRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    mediaRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    if (media.paused) {
      media.play();
    } else {
      media.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    media.currentTime = Math.max(0, Math.min(time, media.duration || 0));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    media.volume = Math.max(0, Math.min(1, volume));
    media.muted = volume === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    media.muted = !media.muted;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    media.playbackRate = rate;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      media.parentElement?.requestFullscreen();
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    setState((prev) => ({ ...prev, currentTime: media.currentTime }));
  }, []);

  const handleDurationChange = useCallback(() => {
    const media = mediaRef.current;
    if (!(media && Number.isFinite(media.duration))) {
      return;
    }
    setState((prev) => ({ ...prev, duration: media.duration }));
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (!(media && Number.isFinite(media.duration))) {
      return;
    }
    setState((prev) => ({ ...prev, duration: media.duration }));
  }, []);

  const handlePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const handlePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const handleVolumeChange = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    setState((prev) => ({
      ...prev,
      volume: media.volume,
      isMuted: media.muted,
    }));
  }, []);

  const handleRateChange = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    setState((prev) => ({ ...prev, playbackRate: media.playbackRate }));
  }, []);

  const handleFullscreenChange = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isFullscreen: !!document.fullscreenElement,
    }));
  }, []);

  return {
    mediaRef,
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

export function useMediaControls(hideDelay = 3000) {
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

type MediaAIParams = {
  vespaId: string;
  enabled?: boolean;
};

export function useMediaChapters({ vespaId, enabled = true }: MediaAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.media.getChapters.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.chapters,
  });
}

export function useMediaHighlights({ vespaId, enabled = true }: MediaAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.media.getHighlights.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.highlights,
  });
}

export function useMediaTranscript({ vespaId, enabled = true }: MediaAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.media.getTranscript.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.segments,
  });
}

export function useMediaSummary({ vespaId, enabled = true }: MediaAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.media.getSummary.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
    select: (data) => data.summary,
  });
}

export function useMediaMetadata({ vespaId, enabled = true }: MediaAIParams) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.media.getMetadata.queryOptions({ vespaId }),
    enabled: enabled && !!vespaId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useMediaRegenerate(vespaId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    ...trpc.media.regenerate.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [["media"], { input: { vespaId } }],
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

export function useMediaAsk() {
  const trpc = useTRPC();

  return useMutation(trpc.media.ask.mutationOptions());
}
