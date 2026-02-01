export interface ProcessMediaInput {
  path: string;
  mediaType: "video" | "audio";
  features: string[];
}

export interface MediaSegment {
  start: number;
  end: number;
  transcription: string;
  scenes: string[];
}

export interface ProcessMediaOutput {
  segments: MediaSegment[];
  duration: number;
}

export interface MediaActivities {
  processMedia(input: ProcessMediaInput): Promise<ProcessMediaOutput>;
  extractTranscript(input: { path: string }): Promise<string>;
  generateThumbnails(input: {
    path: string;
    timestamps: number[];
  }): Promise<string[]>;
}
