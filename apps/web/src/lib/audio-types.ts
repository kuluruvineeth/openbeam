export type AudioTab = "transcript" | "summary" | "ask";

export type { QAMessage, TranscriptSegment } from "@/lib/media-types";

export type AudioViewerProps = {
  url: string;
  vespaId: string;
  twelveLabsAssetId: string;
};

export type AudioPlaybackState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
};
