import type { VideoModel } from "./types";

export const TWELVELABS_VIDEO_MODELS: VideoModel[] = [
  {
    id: "marengo-2.7",
    name: "TwelveLabs Marengo 2.7",
    provider: "twelvelabs",
    maxDurationSeconds: 3600,
    supportsAudio: true,
    supportsSearch: true,
    embeddingDimensions: 1024,
    pricing: { perMinuteIndexing: 0.042, perSearch: 0.004 },
  },
  {
    id: "pegasus-1.2",
    name: "TwelveLabs Pegasus 1.2",
    provider: "twelvelabs",
    maxDurationSeconds: 3600,
    supportsAudio: true,
    supportsSearch: false,
    pricing: { perMinuteIndexing: 0.05 },
  },
];

export const RUNWAY_VIDEO_MODELS: VideoModel[] = [
  {
    id: "gen-4",
    name: "Runway Gen-4",
    provider: "runway",
    maxDurationSeconds: 16,
    supportsAudio: false,
    supportsSearch: false,
    pricing: { perMinuteGeneration: 0.5 },
  },
  {
    id: "gen-3-alpha-turbo",
    name: "Runway Gen-3 Alpha Turbo",
    provider: "runway",
    maxDurationSeconds: 10,
    supportsAudio: false,
    supportsSearch: false,
    pricing: { perMinuteGeneration: 0.25 },
  },
];

export const OPENAI_VIDEO_MODELS: VideoModel[] = [
  {
    id: "sora-2",
    name: "OpenAI Sora 2",
    provider: "openai",
    maxDurationSeconds: 60,
    supportsAudio: true,
    supportsSearch: false,
    pricing: { perMinuteGeneration: 1.0 },
  },
];

export const GOOGLE_VIDEO_MODELS: VideoModel[] = [
  {
    id: "veo-3",
    name: "Google Veo 3",
    provider: "google",
    maxDurationSeconds: 120,
    supportsAudio: true,
    supportsSearch: false,
    pricing: { perMinuteGeneration: 0.8 },
  },
];

export const VIDEO_MODELS: VideoModel[] = [
  ...TWELVELABS_VIDEO_MODELS,
  ...RUNWAY_VIDEO_MODELS,
  ...OPENAI_VIDEO_MODELS,
  ...GOOGLE_VIDEO_MODELS,
];

export const DEFAULT_VIDEO_UNDERSTANDING_MODEL_ID = "marengo-2.7";
export const DEFAULT_VIDEO_GENERATION_MODEL_ID = "gen-4";
