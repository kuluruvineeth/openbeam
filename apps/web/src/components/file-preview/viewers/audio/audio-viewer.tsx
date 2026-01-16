"use client";

import { TooltipProvider } from "@openplane/ui";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { AudioPlayer } from "@/components/file-preview/viewers/audio/audio-player";
import {
  AudioSidebarPanel,
  AudioSidebarToggle,
} from "@/components/file-preview/viewers/audio/audio-sidebar";
import { AudioQAPanel } from "@/components/file-preview/viewers/audio/panels/qa-panel";
import { AudioSummaryPanel } from "@/components/file-preview/viewers/audio/panels/summary-panel";
import { AudioTranscriptPanel } from "@/components/file-preview/viewers/audio/panels/transcript-panel";
import {
  useAudioAsk,
  useAudioPlayback,
  useAudioSummary,
  useAudioTranscript,
  useAudioUrlState,
} from "@/hooks/use-audio";
import type { AudioTab, AudioViewerProps } from "@/lib/audio-types";

export function AudioViewer({
  url,
  vespaId,
  twelveLabsAssetId,
}: AudioViewerProps) {
  const [urlState, setUrlState] = useAudioUrlState();
  const { audioRef, state, actions, handlers } = useAudioPlayback();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const transcript = useAudioTranscript({ vespaId });
  const summary = useAudioSummary({ vespaId });
  const askMutation = useAudioAsk();

  useEffect(() => {
    if (urlState.t > 0 && audioRef.current) {
      audioRef.current.currentTime = urlState.t;
    }
  }, [urlState.t, audioRef]);

  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      actions.togglePlay();
    },
    { enableOnFormTags: false }
  );
  useHotkeys(
    "arrowleft",
    (e) => {
      e.preventDefault();
      actions.seek(state.currentTime - 5);
    },
    { enableOnFormTags: false }
  );
  useHotkeys(
    "arrowright",
    (e) => {
      e.preventDefault();
      actions.seek(state.currentTime + 5);
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
    (tab: AudioTab) => setUrlState({ panel: tab }),
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
          <AudioPlayer
            audioRef={audioRef}
            onDurationChange={handlers.onDurationChange}
            onLoadedMetadata={handlers.onLoadedMetadata}
            onPause={handlers.onPause}
            onPlay={handlers.onPlay}
            onRateChange={handlers.onRateChange}
            onSeek={handleSeek}
            onSetPlaybackRate={actions.setPlaybackRate}
            onTimeUpdate={handlers.onTimeUpdate}
            onToggleMute={actions.toggleMute}
            onTogglePlay={actions.togglePlay}
            onVolumeChange={handlers.onVolumeChange}
            state={state}
            url={url}
          />

          {!sidebarOpen && (
            <AudioSidebarToggle isOpen={sidebarOpen} onToggle={toggleSidebar} />
          )}
        </div>

        <AudioSidebarPanel
          activeTab={urlState.panel}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenChange={setSidebarOpen}
          onTabChange={handleTabChange}
        >
          {{
            transcript: (
              <AudioTranscriptPanel
                currentTime={state.currentTime}
                isLoading={transcript.isLoading}
                onSeek={handleSeek}
                segments={transcript.data}
              />
            ),
            summary: (
              <AudioSummaryPanel
                isLoading={summary.isLoading}
                summary={summary.data}
              />
            ),
            ask: (
              <AudioQAPanel
                isAsking={askMutation.isPending}
                onAsk={handleAsk}
                onSeek={handleSeek}
              />
            ),
          }}
        </AudioSidebarPanel>
      </div>
    </TooltipProvider>
  );
}
