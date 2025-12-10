"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  useVideoAsk,
  useVideoChapters,
  useVideoControls,
  useVideoHighlights,
  useVideoMetadata,
  useVideoPlayback,
  useVideoSummary,
  useVideoTranscript,
  useVideoUrlState,
} from "@/hooks/use-video";
import type { VideoTab, VideoViewerProps } from "@/lib/video-types";
import { ChaptersPanel } from "./panels/chapters-panel";
import { HighlightsPanel } from "./panels/highlights-panel";
import { QAPanel } from "./panels/qa-panel";
import { SummaryPanel } from "./panels/summary-panel";
import { TranscriptPanel } from "./panels/transcript-panel";
import { VideoPlayer } from "./video-player";
import { VideoSidebarPanel, VideoSidebarToggle } from "./video-sidebar";
import { VideoToolbar } from "./video-toolbar";

export function VideoViewer({ url, vespaId, videoId }: VideoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [urlState, setUrlState] = useVideoUrlState();
  const { videoRef, state, actions, handlers } = useVideoPlayback();
  const controls = useVideoControls();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chapters = useVideoChapters({ vespaId });
  const highlights = useVideoHighlights({ vespaId });
  const transcript = useVideoTranscript({ vespaId });
  const summary = useVideoSummary({ vespaId });
  const metadata = useVideoMetadata({ vespaId });
  const askMutation = useVideoAsk();

  useEffect(() => {
    if (urlState.t > 0 && videoRef.current) {
      videoRef.current.currentTime = urlState.t;
    }
  }, [urlState.t, videoRef]);

  useEffect(() => {
    const handleFullscreen = () => handlers.onFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreen);
  }, [handlers]);

  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      actions.togglePlay();
    },
    { enableOnFormTags: false }
  );

  const handleSeek = useCallback(
    (time: number) => {
      actions.seek(time);
      setUrlState({ t: Math.floor(time) });
    },
    [actions, setUrlState]
  );

  const handleTabChange = useCallback(
    (tab: VideoTab) => setUrlState({ panel: tab }),
    [setUrlState]
  );

  const handleAsk = useCallback(
    async (question: string) => {
      const result = await askMutation.mutateAsync({ videoId, question });
      return result.answer;
    },
    [askMutation, videoId]
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full w-full">
        <div className="relative min-w-0 flex-1 transition-all duration-300 ease-out">
          <VideoPlayer
            chapters={chapters.data}
            onClick={actions.togglePlay}
            onDurationChange={handlers.onDurationChange}
            onLoadedMetadata={handlers.onLoadedMetadata}
            onMouseMove={controls.show}
            onPause={handlers.onPause}
            onPlay={handlers.onPlay}
            onRateChange={handlers.onRateChange}
            onTimeUpdate={handlers.onTimeUpdate}
            onVolumeChange={handlers.onVolumeChange}
            ref={containerRef}
            state={state}
            url={url}
            videoRef={videoRef}
          />

          <VideoToolbar
            onSeek={handleSeek}
            onSetPlaybackRate={actions.setPlaybackRate}
            onToggleFullscreen={actions.toggleFullscreen}
            onToggleMute={actions.toggleMute}
            onTogglePlay={actions.togglePlay}
            state={state}
            visible={controls.visible}
          />

          {!sidebarOpen && (
            <VideoSidebarToggle isOpen={sidebarOpen} onToggle={toggleSidebar} />
          )}
        </div>

        <VideoSidebarPanel
          activeTab={urlState.panel}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenChange={setSidebarOpen}
          onTabChange={handleTabChange}
        >
          {{
            chapters: (
              <ChaptersPanel
                chapters={chapters.data}
                currentTime={state.currentTime}
                isLoading={chapters.isLoading}
                onSeek={handleSeek}
              />
            ),
            highlights: (
              <HighlightsPanel
                currentTime={state.currentTime}
                highlights={highlights.data}
                isLoading={highlights.isLoading}
                onSeek={handleSeek}
              />
            ),
            transcript: (
              <TranscriptPanel
                currentTime={state.currentTime}
                isLoading={transcript.isLoading}
                onSeek={handleSeek}
                segments={transcript.data}
              />
            ),
            ask: (
              <QAPanel
                isAsking={askMutation.isPending}
                onAsk={handleAsk}
                onSeek={handleSeek}
              />
            ),
            info: (
              <SummaryPanel
                isLoadingSummary={summary.isLoading || metadata.isLoading}
                summary={summary.data ?? metadata.data?.summary ?? undefined}
              />
            ),
          }}
        </VideoSidebarPanel>
      </div>
    </TooltipProvider>
  );
}
