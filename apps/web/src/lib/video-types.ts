export type VideoChapter = {
  chapterNumber: number;
  title: string;
  summary: string;
  startSec: number;
  endSec: number;
};

export type VideoHighlight = {
  highlight: string;
  summary: string;
  startSec: number;
  endSec: number;
};

export type VideoGist = {
  title?: string;
  topics?: string[];
  hashtags?: string[];
};

export type VideoAnalysisResult = {
  answer: string;
  videoId: string;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  value: string;
};

export type VideoTab =
  | "chapters"
  | "highlights"
  | "transcript"
  | "ask"
  | "info";

export type VideoViewerProps = {
  fileName: string;
  url: string;
  vespaId: string;
  videoId: string;
};

export type VideoPlaybackState = {
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
