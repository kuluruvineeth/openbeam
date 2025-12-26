"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ChaptersPanel } from "@/components/file-preview/viewers/video/panels/chapters-panel";
import { HighlightsPanel } from "@/components/file-preview/viewers/video/panels/highlights-panel";
import { QAPanel } from "@/components/file-preview/viewers/video/panels/qa-panel";
import { SummaryPanel } from "@/components/file-preview/viewers/video/panels/summary-panel";
import { TranscriptPanel } from "@/components/file-preview/viewers/video/panels/transcript-panel";
import { VideoPlayer } from "@/components/file-preview/viewers/video/video-player";
import {
  VideoSidebarPanel,
  VideoSidebarToggle,
} from "@/components/file-preview/viewers/video/video-sidebar";
import { VideoToolbar } from "@/components/file-preview/viewers/video/video-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  useMediaAsk,
  useMediaChapters,
  useMediaControls,
  useMediaHighlights,
  useMediaMetadata,
  useMediaPlayback,
  useMediaSummary,
  useMediaTranscript,
  useMediaUrlState,
} from "@/hooks/use-media";
import type { MediaTab, MediaViewerProps } from "@/lib/media-types";

export function VideoViewer({
  url,
  vespaId,
  twelveLabsAssetId,
}: MediaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [urlState, setUrlState] = useMediaUrlState();
  const { mediaRef, state, actions, handlers } = useMediaPlayback();
  const controls = useMediaControls();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chapters = useMediaChapters({ vespaId });
  const highlights = useMediaHighlights({ vespaId });
  const transcript = useMediaTranscript({ vespaId });
  const summary = useMediaSummary({ vespaId });
  const metadata = useMediaMetadata({ vespaId });
  const askMutation = useMediaAsk();

  useEffect(() => {
    if (urlState.t > 0 && mediaRef.current) {
      mediaRef.current.currentTime = urlState.t;
    }
  }, [urlState.t, mediaRef]);

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
    (tab: MediaTab) => setUrlState({ panel: tab }),
    [setUrlState]
  );

  const handleAsk = useCallback(
    async (question: string) => {
      const result = await askMutation.mutateAsync({
        mediaId: twelveLabsAssetId,
        question,
      });
      return result.answer;
    },
    [askMutation, twelveLabsAssetId]
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
            videoRef={mediaRef}
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
