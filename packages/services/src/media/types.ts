export interface ServiceMediaChapter {
  chapterNumber: number;
  title: string;
  summary: string;
  startSec: number;
  endSec: number;
}

export interface ServiceMediaHighlight {
  highlight: string;
  summary: string;
  startSec: number;
  endSec: number;
}

export interface MediaGist {
  title?: string;
  topics?: string[];
  hashtags?: string[];
}

export interface MediaAnalysisResult {
  answer: string;
  mediaId: string;
}

export interface MediaSummaryOptions {
  prompt?: string;
  temperature?: number;
}

export interface MediaAnalysisOptions {
  temperature?: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  value: string;
}

export interface ImageSearchOptions {
  threshold?: "high" | "medium" | "low" | "none";
  pageLimit?: number;
}
