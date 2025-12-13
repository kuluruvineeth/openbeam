export type MediaChapter = {
  chapterNumber: number;
  title: string;
  summary: string;
  startSec: number;
  endSec: number;
};

export type MediaHighlight = {
  highlight: string;
  summary: string;
  startSec: number;
  endSec: number;
};

export type MediaGist = {
  title?: string;
  topics?: string[];
  hashtags?: string[];
};

export type MediaAnalysisResult = {
  answer: string;
  mediaId: string;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  value: string;
};

export type MediaTab =
  | "chapters"
  | "highlights"
  | "transcript"
  | "ask"
  | "info";

export type MediaViewerProps = {
  url: string;
  vespaId: string;
  twelveLabsAssetId: string;
};

export type MediaPlaybackState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;
  isMuted: boolean;
};

export type QAMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamps?: number[];
};
