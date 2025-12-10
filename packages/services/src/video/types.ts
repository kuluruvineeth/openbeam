export interface VideoChapter {
  chapterNumber: number;
  title: string;
  summary: string;
  startSec: number;
  endSec: number;
}

export interface VideoHighlight {
  highlight: string;
  summary: string;
  startSec: number;
  endSec: number;
}

export interface VideoGist {
  title?: string;
  topics?: string[];
  hashtags?: string[];
}

export interface VideoAnalysisResult {
  answer: string;
  videoId: string;
}

export interface VideoSummaryOptions {
  prompt?: string;
  temperature?: number;
}

export interface VideoAnalysisOptions {
  temperature?: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  value: string;
}

export interface ImageSearchResult {
  videoId: string;
  score: number;
  startSec: number;
  endSec: number;
  confidence: string;
  thumbnailUrl?: string;
}

export interface ImageSearchOptions {
  threshold?: "high" | "medium" | "low" | "none";
  pageLimit?: number;
}
